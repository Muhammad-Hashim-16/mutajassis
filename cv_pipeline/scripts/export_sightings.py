"""
export_sightings.py — Batch process CCTV videos and export GridWatch sightings.

Processes all cameras configured in `cameras_config.json`, running vehicle tracking,
plate detection, and EasyOCR text extraction. Applies consensus filtering to determine
final plate readability, saves vehicle snapshots, and exports `sightings.json`,
`cameras.json`, and `sightings.csv`.

Usage:
    python scripts/export_sightings.py
"""

import os
import sys
import re
import csv
import json
import time
from collections import defaultdict, Counter

# Fix for duplicate OpenMP runtime on Windows
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import cv2
import numpy as np
from ultralytics import YOLO

# Import helper functions from detect_track_plate.py
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.append(SCRIPT_DIR)

from detect_track_plate import (
    normalize_plate_text,
    detect_plate_in_crop,
    run_ocr_on_plate,
    draw_annotations,
    CLASS_COLORS,
    DEFAULT_COLOR,
    PLATE_BOX_COLOR,
    PLATE_TEXT_COLOR,
)

# ─────────────────────────────────────────────────────────────────────
# CONFIGURATION & CONSTANTS
# ─────────────────────────────────────────────────────────────────────

# Consensus guard & track filtering thresholds
MIN_PLATE_VOTES = 2      # Minimum agreeing frame readings required for 'readable' status
MIN_PLATE_LENGTH = 4     # Minimum character length required for valid plate text
MIN_TRACK_FRAMES = 2     # Minimum processed frames to keep a vehicle track

# Video processing sampling & confidence thresholds
FRAME_SAMPLE_INTERVAL = 5
VEHICLE_CONF_THRESHOLD = 0.25
PLATE_CONF_THRESHOLD = 0.20
MIN_PLATE_WIDTH = 20
MIN_PLATE_HEIGHT = 10

VEHICLE_CLASS_IDS = {2, 3, 5, 7}  # COCO IDs for car, motorcycle, bus, truck

# Paths
CONFIG_PATH = os.path.join(PROJECT_DIR, "cameras_config.json")
SAMPLE_DATA_DIR = os.path.join(PROJECT_DIR, "sample_data")
OUTPUT_DIR = os.path.join(PROJECT_DIR, "output")
SNAPSHOTS_DIR = os.path.join(OUTPUT_DIR, "snapshots")
VEHICLE_MODEL_PATH = "yolov8n.pt"
PLATE_MODEL_PATH = os.path.join(PROJECT_DIR, "models", "lp_detector_yolov8n.pt")


# ─────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────

def format_canonical_plate(text: str) -> str:
    """
    Format a normalized plate text into canonical display form:
    Uppercase letters prefix, a single hyphen, then digits (e.g. "FDJ1042" -> "FDJ-1042").
    If text does not split cleanly into letters-then-digits, keep as-is uppercase.
    """
    if not text:
        return None
    text = text.upper().strip()
    m = re.match(r"^([A-Z]+)([0-9]+)$", text)
    if m:
        return f"{m.group(1)}-{m.group(2)}"
    return text


def create_snapshot(frame: np.ndarray, det: dict, output_path: str):
    """
    Draw vehicle & plate annotations on frame, crop vehicle region with ~15% padding,
    resize to max 480px on longer side, and save to output_path.
    """
    frame_h, frame_w = frame.shape[:2]
    annotated = draw_annotations(frame.copy(), [det])

    vx1, vy1 = int(det["x1"]), int(det["y1"])
    vx2, vy2 = int(det["x2"]), int(det["y2"])
    vw = vx2 - vx1
    vh = vy2 - vy1

    # Add ~15% padding on each side
    pad_w = int(vw * 0.15)
    pad_h = int(vh * 0.15)

    cx1 = max(0, vx1 - pad_w)
    cy1 = max(0, vy1 - pad_h)
    cx2 = min(frame_w, vx2 + pad_w)
    cy2 = min(frame_h, vy2 + pad_h)

    # Check for degenerate crop
    if (cx2 - cx1) < 10 or (cy2 - cy1) < 10:
        crop = annotated
    else:
        crop = annotated[cy1:cy2, cx1:cx2]

    # Resize so longer side is at most 480px
    ch, cw = crop.shape[:2]
    max_dim = max(ch, cw)
    if max_dim > 480:
        scale = 480.0 / max_dim
        nw, nh = int(cw * scale), int(ch * scale)
        crop = cv2.resize(crop, (nw, nh), interpolation=cv2.INTER_AREA)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cv2.imwrite(output_path, crop)


# ─────────────────────────────────────────────────────────────────────
# MAIN EXPORT PROCESSOR
# ─────────────────────────────────────────────────────────────────────

def main():
    print(f"\n{'='*70}")
    print(f"  GridWatch Sightings Export Pipeline")
    print(f"{'='*70}")
    print(f"  Config File         : {CONFIG_PATH}")
    print(f"  Output Directory    : {OUTPUT_DIR}")
    print(f"  MIN_PLATE_VOTES     : {MIN_PLATE_VOTES}")
    print(f"  MIN_PLATE_LENGTH    : {MIN_PLATE_LENGTH}")
    print(f"  MIN_TRACK_FRAMES    : {MIN_TRACK_FRAMES}")
    print(f"{'='*70}\n")

    # ── 1. Load Cameras Config ───────────────────────────────────────
    if not os.path.isfile(CONFIG_PATH):
        print(f"[FATAL] Config file not found at: {CONFIG_PATH}")
        sys.exit(1)

    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            cameras_config = json.load(f)
    except Exception as e:
        print(f"[FATAL] Failed to parse cameras_config.json: {e}")
        sys.exit(1)

    if not isinstance(cameras_config, list) or len(cameras_config) == 0:
        print(f"[FATAL] cameras_config.json must contain a non-empty array of camera configs.")
        sys.exit(1)

    # ── 2. Load Models & EasyOCR ──────────────────────────────────────
    print("Loading detection models and OCR engine...")
    try:
        vehicle_model = YOLO(VEHICLE_MODEL_PATH)
        plate_model = YOLO(PLATE_MODEL_PATH)
    except Exception as e:
        print(f"[FATAL] Failed to load YOLO models: {e}")
        sys.exit(1)

    try:
        import easyocr
        ocr_reader = easyocr.Reader(["en"], gpu=False, verbose=False)
        print("  Models and EasyOCR successfully loaded.\n")
    except Exception as e:
        print(f"[FATAL] Failed to initialize EasyOCR: {e}")
        sys.exit(1)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(SNAPSHOTS_DIR, exist_ok=True)

    all_sightings = []
    cameras_export = []
    sighting_counter = 1

    # ── 3. Process Each Camera Video ─────────────────────────────────
    for cam in cameras_config:
        cam_id = cam.get("id")
        cam_name = cam.get("name")
        video_filename = cam.get("video_file")

        cameras_export.append({
            "id": cam_id,
            "name": cam_name,
            "video_url": f"/sample-videos/{video_filename}"
        })

        video_path = os.path.join(SAMPLE_DATA_DIR, video_filename)

        print(f"──────────────────────────────────────────────────────────────────────")
        print(f"Processing Camera: {cam_id} ({cam_name})")
        print(f"Video File       : {video_path}")

        if not os.path.isfile(video_path):
            print(f"[WARNING] Video file for camera {cam_id} not found: {video_path}. Skipping camera.")
            continue

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"[WARNING] Could not open video file for camera {cam_id}: {video_path}. Skipping camera.")
            continue

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0:
            fps = 25.0

        # Storage for this camera
        track_detections = defaultdict(list)    # track_id -> list of (frame_img, det_dict, plate_reading)

        frame_idx = 0
        frames_processed = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % FRAME_SAMPLE_INTERVAL != 0:
                frame_idx += 1
                continue

            timestamp_sec = frame_idx / fps
            frame_h, frame_w = frame.shape[:2]

            try:
                results = vehicle_model.track(
                    source=frame,
                    persist=True,
                    tracker="bytetrack.yaml",
                    device="cpu",
                    conf=VEHICLE_CONF_THRESHOLD,
                    classes=list(VEHICLE_CLASS_IDS),
                    verbose=False,
                )

                boxes = results[0].boxes
                if boxes is not None and len(boxes) > 0:
                    track_ids = boxes.id
                    if track_ids is not None:
                        track_ids = track_ids.cpu().numpy().astype(int)
                    else:
                        track_ids = [None] * len(boxes)

                    for i, box in enumerate(boxes):
                        cls_id = int(box.cls.item())
                        if cls_id not in VEHICLE_CLASS_IDS:
                            continue

                        class_name = vehicle_model.names[cls_id]
                        conf = float(box.conf.item())
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        tid = int(track_ids[i]) if track_ids[i] is not None else None

                        if tid is None:
                            continue

                        det = {
                            "track_id": tid,
                            "class_name": class_name,
                            "confidence": conf,
                            "x1": float(x1), "y1": float(y1),
                            "x2": float(x2), "y2": float(y2),
                            "frame_number": frame_idx,
                            "timestamp_sec": round(timestamp_sec, 3),
                            "plate_x1": None, "plate_y1": None,
                            "plate_x2": None, "plate_y2": None,
                            "plate_ocr_text": "",
                        }

                        # Crop vehicle region
                        vx1, vy1 = max(0, int(x1)), max(0, int(y1))
                        vx2, vy2 = min(frame_w, int(x2)), min(frame_h, int(y2))

                        plate_reading = {
                            "plate_detected": False,
                            "ocr_text": None,
                            "ocr_confidence": 0.0,
                        }

                        if (vx2 - vx1) >= 5 and (vy2 - vy1) >= 5:
                            vehicle_crop = frame[vy1:vy2, vx1:vx2]
                            plate_res = detect_plate_in_crop(plate_model, vehicle_crop)

                            if plate_res is not None:
                                px1_rel, py1_rel, px2_rel, py2_rel, plate_conf = plate_res
                                plate_reading["plate_detected"] = True

                                px1_abs = vx1 + px1_rel
                                py1_abs = vy1 + py1_rel
                                px2_abs = vx1 + px2_rel
                                py2_abs = vy1 + py2_rel

                                det["plate_x1"] = px1_abs
                                det["plate_y1"] = py1_abs
                                det["plate_x2"] = px2_abs
                                det["plate_y2"] = py2_abs

                                pw = px2_rel - px1_rel
                                ph = py2_rel - py1_rel

                                if pw >= MIN_PLATE_WIDTH and ph >= MIN_PLATE_HEIGHT:
                                    plate_crop = vehicle_crop[
                                        max(0, py1_rel):py2_rel,
                                        max(0, px1_rel):px2_rel,
                                    ]

                                    if plate_crop.size > 0:
                                        raw_text, ocr_conf = run_ocr_on_plate(
                                            ocr_reader, plate_crop
                                        )
                                        if raw_text is not None:
                                            plate_reading["ocr_text"] = raw_text
                                            plate_reading["ocr_confidence"] = ocr_conf
                                            det["plate_ocr_text"] = raw_text

                        track_detections[tid].append((frame.copy(), det, plate_reading))

            except Exception as e:
                print(f"  [WARNING] Exception processing frame {frame_idx}: {e}")

            frames_processed += 1
            frame_idx += 1

        cap.release()

        # ── 4. Filter Tracks & Determine Sightings ───────────────────────
        kept_count = 0
        dropped_count = 0

        for tid in sorted(track_detections.keys()):
            items = track_detections[tid]
            num_frames = len(items)

            if num_frames < MIN_TRACK_FRAMES:
                dropped_count += 1
                continue

            kept_count += 1

            timestamps = [det["timestamp_sec"] for _, det, _ in items]
            first_seen = min(timestamps)
            last_seen = max(timestamps)
            dwell = round(last_seen - first_seen, 1)

            # Consensus guard check
            readings = [pr for _, _, pr in items]
            frames_with_plate = sum(1 for r in readings if r["plate_detected"])
            readable_readings = [
                r for r in readings
                if r["plate_detected"] and r["ocr_text"] is not None
            ]

            normalized_list = []
            for r in readable_readings:
                norm = normalize_plate_text(r["ocr_text"])
                if norm:
                    normalized_list.append((norm, r["ocr_confidence"]))

            plate_status = "no_plate"
            final_plate_text = None
            final_plate_conf = None

            if normalized_list:
                text_counter = Counter(t for t, c in normalized_list)
                most_common_text, most_common_count = text_counter.most_common(1)[0]

                # Tie-breaking by highest average confidence
                tied_texts = [t for t, cnt in text_counter.items() if cnt == most_common_count]
                if len(tied_texts) > 1:
                    best_text = None
                    best_avg_conf = -1.0
                    for t in tied_texts:
                        confs = [c for norm_t, c in normalized_list if norm_t == t]
                        avg = sum(confs) / len(confs)
                        if avg > best_avg_conf:
                            best_avg_conf = avg
                            best_text = t
                    most_common_text = best_text

                # Consensus Guard Check: MIN_PLATE_VOTES and MIN_PLATE_LENGTH
                if most_common_count >= MIN_PLATE_VOTES and len(most_common_text) >= MIN_PLATE_LENGTH:
                    winning_confs = [c for t, c in normalized_list if t == most_common_text]
                    avg_conf = sum(winning_confs) / len(winning_confs)

                    plate_status = "readable"
                    final_plate_text = format_canonical_plate(most_common_text)
                    final_plate_conf = round(avg_conf, 2)
                else:
                    plate_status = "unreadable"
                    final_plate_text = None
                    final_plate_conf = None
            else:
                if frames_with_plate > 0:
                    plate_status = "unreadable"
                else:
                    plate_status = "no_plate"

            # ── 5. Select Best Frame & Create Snapshot ────────────────────
            # Priority 1: frame with highest OCR confidence
            # Priority 2: frame with highest vehicle detection confidence
            best_item = None
            best_ocr_conf = -1.0
            best_veh_conf = -1.0

            for frame_img, det, pr in items:
                ocr_conf = pr["ocr_confidence"] if pr["ocr_text"] else 0.0
                veh_conf = det["confidence"]

                if ocr_conf > best_ocr_conf:
                    best_ocr_conf = ocr_conf
                    best_veh_conf = veh_conf
                    best_item = (frame_img, det)
                elif abs(ocr_conf - best_ocr_conf) < 1e-5 and veh_conf > best_veh_conf:
                    best_veh_conf = veh_conf
                    best_item = (frame_img, det)

            sighting_id = f"s-{sighting_counter:03d}"
            snapshot_filename = f"{sighting_id}.jpg"
            snapshot_filepath = os.path.join(SNAPSHOTS_DIR, snapshot_filename)

            if best_item is not None:
                create_snapshot(best_item[0], best_item[1], snapshot_filepath)

            sighting_entry = {
                "id": sighting_id,
                "camera_id": cam_id,
                "track_id": f"trk-{tid}",
                "plate_text": final_plate_text,
                "plate_confidence": final_plate_conf,
                "plate_status": plate_status,
                "first_seen_sec": round(first_seen, 1),
                "last_seen_sec": round(last_seen, 1),
                "dwell_sec": dwell,
                "snapshot_url": f"/snapshots/{snapshot_filename}",
            }

            all_sightings.append(sighting_entry)
            sighting_counter += 1

        print(f"  Summary: {kept_count} tracks kept, {dropped_count} tracks dropped (< {MIN_TRACK_FRAMES} frames)")

    # ── 6. Export Output Files ─────────────────────────────────────────
    sightings_json_path = os.path.join(OUTPUT_DIR, "sightings.json")
    cameras_json_path = os.path.join(OUTPUT_DIR, "cameras.json")
    sightings_csv_path = os.path.join(OUTPUT_DIR, "sightings.csv")

    with open(sightings_json_path, "w", encoding="utf-8") as f:
        json.dump(all_sightings, f, indent=2)

    with open(cameras_json_path, "w", encoding="utf-8") as f:
        json.dump(cameras_export, f, indent=2)

    fieldnames = [
        "id", "camera_id", "track_id", "plate_text", "plate_confidence",
        "plate_status", "first_seen_sec", "last_seen_sec", "dwell_sec", "snapshot_url"
    ]

    with open(sightings_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in all_sightings:
            writer.writerow(row)

    # ── 7. Console Summary ────────────────────────────────────────────
    print(f"\n{'='*70}")
    print(f"  SIGHTINGS EXPORT SUMMARY")
    print(f"{'='*70}")
    print(f"  Total Sightings Kept : {len(all_sightings)}")
    print(f"  Total Cameras        : {len(cameras_export)}")
    print()

    if all_sightings:
        print(f"  {'ID':<7} {'Camera':<9} {'Track':<8} {'Status':<12} {'Plate Text':<12} {'Dwell(s)':<8}")
        print(f"  {'-'*7} {'-'*9} {'-'*8} {'-'*12} {'-'*12} {'-'*8}")
        for s in all_sightings:
            p_text = s["plate_text"] if s["plate_text"] else "null"
            print(f"  {s['id']:<7} {s['camera_id']:<9} {s['track_id']:<8} {s['plate_status']:<12} {p_text:<12} {s['dwell_sec']:<8.1f}")
    else:
        print("  No kept sightings.")

    print(f"\n  Exported Files:")
    print(f"    • Sightings JSON : {sightings_json_path}")
    print(f"    • Cameras JSON   : {cameras_json_path}")
    print(f"    • Sightings CSV  : {sightings_csv_path}")
    print(f"    • Snapshots Dir  : {SNAPSHOTS_DIR}")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    main()
