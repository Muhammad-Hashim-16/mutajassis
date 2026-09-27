"""
detect_track_plate.py — Vehicle detection + tracking + plate OCR.

Extends detect_and_track.py by adding:
  1. License-plate detection on each tracked vehicle crop (pretrained YOLOv8 LP model)
  2. EasyOCR text extraction from detected plate regions
  3. Per-track majority-vote plate aggregation

Produces:
  • Console summary with plate_text, plate_status, plate_confidence per track
  • Annotated output video with vehicle boxes, plate boxes, and raw OCR text

Usage:
    python scripts/detect_track_plate.py <path_to_video>
    python scripts/detect_track_plate.py                   # uses DEFAULT_VIDEO_PATH
"""

import os
import sys
import re
import time
from collections import defaultdict, Counter

# Fix for duplicate OpenMP runtime on Anaconda/Windows
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import cv2
import numpy as np
from ultralytics import YOLO

# ─────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────

# Process every Nth frame (1 = every frame, 5 = every 5th frame, etc.)
FRAME_SAMPLE_INTERVAL = 5

# Default video path when no CLI argument is provided
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DEFAULT_VIDEO_PATH = os.path.join(PROJECT_DIR, "sample_data", "cctv_video.mp4")

# Output directory for annotated videos
OUTPUT_DIR = os.path.join(PROJECT_DIR, "output")

# Model paths
VEHICLE_MODEL_PATH = "yolov8n.pt"
PLATE_MODEL_PATH = os.path.join(PROJECT_DIR, "models", "lp_detector_yolov8n.pt")

# COCO class IDs for vehicles (2=car, 3=motorcycle, 5=bus, 7=truck)
VEHICLE_CLASS_IDS = {2, 3, 5, 7}

# Confidence thresholds
VEHICLE_CONF_THRESHOLD = 0.25
PLATE_CONF_THRESHOLD = 0.20

# Minimum plate crop size (pixels) below which OCR is skipped
MIN_PLATE_WIDTH = 20
MIN_PLATE_HEIGHT = 10

# Annotation colours per class (BGR)
CLASS_COLORS = {
    "car":        (0, 255, 0),     # green
    "motorcycle": (255, 165, 0),   # orange-ish
    "bus":        (255, 0, 0),     # blue
    "truck":      (0, 0, 255),     # red
}
DEFAULT_COLOR = (255, 255, 255)    # white fallback
PLATE_BOX_COLOR = (0, 255, 255)    # yellow for plate bounding boxes
PLATE_TEXT_COLOR = (0, 255, 255)   # yellow for OCR text overlay


# ─────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────

def resolve_video_path() -> str:
    """Return video path from CLI arg or default."""
    if len(sys.argv) > 1:
        path = sys.argv[1]
    else:
        path = DEFAULT_VIDEO_PATH
        print(f"No video path argument provided — using default: {path}")
    return path


def open_video(path: str) -> cv2.VideoCapture:
    """Open video file and validate it's readable. Exits on failure."""
    if not os.path.isfile(path):
        print(f"[ERROR] Video file not found: {path}")
        sys.exit(1)

    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        print(f"[ERROR] Could not open video file (may be corrupted or unsupported codec): {path}")
        sys.exit(1)

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames <= 0:
        print(f"[ERROR] Video has zero frames or is unreadable: {path}")
        cap.release()
        sys.exit(1)

    return cap


def build_output_path(input_path: str) -> str:
    """Build annotated output video path in OUTPUT_DIR."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    basename = os.path.splitext(os.path.basename(input_path))[0]
    return os.path.join(OUTPUT_DIR, f"annotated_plates_{basename}.mp4")


def normalize_plate_text(text: str) -> str:
    """
    Normalize a raw OCR plate reading:
    - Uppercase
    - Strip whitespace
    - Keep only alphanumeric characters and hyphens
    """
    text = text.upper().strip()
    text = re.sub(r"[^A-Z0-9\-]", "", text)
    return text


def detect_plate_in_crop(plate_model, vehicle_crop):
    """
    Run the license-plate YOLOv8 model on a cropped vehicle image.

    Returns:
        (px1, py1, px2, py2, plate_conf) relative to vehicle_crop,
        or None if no plate detected.
    """
    results = plate_model.predict(
        source=vehicle_crop,
        device="cpu",
        conf=PLATE_CONF_THRESHOLD,
        verbose=False,
    )

    boxes = results[0].boxes
    if boxes is None or len(boxes) == 0:
        return None

    # Take the highest-confidence plate detection
    best_idx = int(boxes.conf.argmax())
    px1, py1, px2, py2 = boxes.xyxy[best_idx].cpu().numpy().astype(int)
    plate_conf = float(boxes.conf[best_idx].item())

    return (px1, py1, px2, py2, plate_conf)


def run_ocr_on_plate(ocr_reader, plate_crop):
    """
    Run EasyOCR on a plate crop image.

    Returns:
        (raw_text, confidence) or (None, 0.0) if nothing readable.
    """
    try:
        results = ocr_reader.readtext(plate_crop)
    except Exception as e:
        print(f"    [WARNING] EasyOCR threw an exception on plate crop: {e}")
        return (None, 0.0)

    if not results:
        return (None, 0.0)

    # Concatenate all detected text segments
    texts = []
    confidences = []
    for (bbox, text, conf) in results:
        if text and text.strip():
            texts.append(text.strip())
            confidences.append(conf)

    if not texts:
        return (None, 0.0)

    combined_text = " ".join(texts)
    avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
    return (combined_text, avg_conf)


def draw_annotations(frame, detections):
    """
    Draw vehicle bounding boxes, plate bounding boxes, and OCR text on a frame.

    `detections` is a list of dicts with keys:
        track_id, class_name, confidence, x1, y1, x2, y2
        and optionally: plate_x1..plate_y2 (full-frame coords), plate_ocr_text
    """
    for det in detections:
        vx1, vy1 = int(det["x1"]), int(det["y1"])
        vx2, vy2 = int(det["x2"]), int(det["y2"])
        tid = det["track_id"]
        cls = det["class_name"]
        conf = det["confidence"]
        color = CLASS_COLORS.get(cls, DEFAULT_COLOR)

        # ── Vehicle bounding box ──
        cv2.rectangle(frame, (vx1, vy1), (vx2, vy2), color, 2)

        # Vehicle label
        label = f"ID:{tid} {cls} {conf:.2f}"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
        cv2.rectangle(frame, (vx1, vy1 - th - 8), (vx1 + tw + 4, vy1), color, -1)
        cv2.putText(frame, label, (vx1 + 2, vy1 - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1, cv2.LINE_AA)

        # ── Plate bounding box (if detected) ──
        if det.get("plate_x1") is not None:
            px1, py1 = int(det["plate_x1"]), int(det["plate_y1"])
            px2, py2 = int(det["plate_x2"]), int(det["plate_y2"])
            cv2.rectangle(frame, (px1, py1), (px2, py2), PLATE_BOX_COLOR, 2)

            # OCR text label below the plate box
            ocr_text = det.get("plate_ocr_text", "")
            if ocr_text:
                (otw, oth), _ = cv2.getTextSize(ocr_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                cv2.rectangle(frame, (px1, py2), (px1 + otw + 4, py2 + oth + 8),
                              PLATE_BOX_COLOR, -1)
                cv2.putText(frame, ocr_text, (px1 + 2, py2 + oth + 4),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA)

    return frame


def aggregate_plate_results(track_plate_readings):
    """
    Aggregate per-frame plate readings for a single track.

    Args:
        track_plate_readings: list of dicts, each with:
            - plate_detected (bool)
            - ocr_text (str or None) — raw text
            - ocr_confidence (float)

    Returns:
        dict with: plate_status, plate_text, plate_confidence,
                   frames_with_plate, frames_with_readable_text
    """
    frames_with_plate = sum(1 for r in track_plate_readings if r["plate_detected"])
    readable_readings = [
        r for r in track_plate_readings
        if r["plate_detected"] and r["ocr_text"] is not None
    ]

    # Normalize all readable texts
    normalized = []
    for r in readable_readings:
        norm = normalize_plate_text(r["ocr_text"])
        if norm:  # non-empty after normalization
            normalized.append((norm, r["ocr_confidence"]))

    frames_with_readable = len(normalized)

    if not normalized:
        # No usable plate text at all
        if frames_with_plate > 0:
            return {
                "plate_status": "unreadable",
                "plate_text": "N/A",
                "plate_confidence": 0.0,
                "frames_with_plate": frames_with_plate,
                "frames_with_readable_text": 0,
            }
        else:
            return {
                "plate_status": "no_plate",
                "plate_text": "N/A",
                "plate_confidence": 0.0,
                "frames_with_plate": 0,
                "frames_with_readable_text": 0,
            }

    # Majority vote: pick most frequent normalized text
    text_counter = Counter(t for t, c in normalized)
    most_common_text, most_common_count = text_counter.most_common(1)[0]

    # Check for ties
    tied_texts = [t for t, cnt in text_counter.items() if cnt == most_common_count]
    if len(tied_texts) > 1:
        # Break tie by highest average OCR confidence
        best_text = None
        best_avg_conf = -1.0
        for t in tied_texts:
            confs = [c for norm_t, c in normalized if norm_t == t]
            avg = sum(confs) / len(confs)
            if avg > best_avg_conf:
                best_avg_conf = avg
                best_text = t
        most_common_text = best_text

    # Compute average confidence for the winning text
    winning_confs = [c for t, c in normalized if t == most_common_text]
    avg_conf = sum(winning_confs) / len(winning_confs)

    return {
        "plate_status": "readable",
        "plate_text": most_common_text,
        "plate_confidence": round(avg_conf, 3),
        "frames_with_plate": frames_with_plate,
        "frames_with_readable_text": frames_with_readable,
    }


# ─────────────────────────────────────────────────────────────────────
# MAIN PIPELINE
# ─────────────────────────────────────────────────────────────────────

def main():
    # ── Resolve input video ──────────────────────────────────────────
    video_path = resolve_video_path()
    cap = open_video(video_path)

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    if fps <= 0:
        print("[WARNING] Video reports FPS <= 0, defaulting to 25.0")
        fps = 25.0

    print(f"\n{'='*70}")
    print(f"  Vehicle Detection + Tracking + Plate OCR")
    print(f"{'='*70}")
    print(f"  Input       : {video_path}")
    print(f"  Resolution  : {width}x{height}")
    print(f"  Total frames: {total_frames}")
    print(f"  FPS         : {fps}")
    print(f"  Duration    : {total_frames / fps:.1f}s")
    print(f"  Sampling    : every {FRAME_SAMPLE_INTERVAL} frame(s)")
    print(f"  Frames to process: ~{total_frames // FRAME_SAMPLE_INTERVAL}")
    print(f"{'='*70}\n")

    # ── Load models ──────────────────────────────────────────────────
    print("Loading models...")
    try:
        vehicle_model = YOLO(VEHICLE_MODEL_PATH)
        print(f"  Vehicle model loaded: {VEHICLE_MODEL_PATH}")
    except Exception as e:
        print(f"[FATAL] Failed to load vehicle detection model: {e}")
        sys.exit(1)

    try:
        plate_model = YOLO(PLATE_MODEL_PATH)
        print(f"  Plate model loaded : {PLATE_MODEL_PATH}")
    except Exception as e:
        print(f"[FATAL] Failed to load license plate model: {e}")
        print(f"  Expected at: {PLATE_MODEL_PATH}")
        sys.exit(1)

    # ── Load EasyOCR (lazy import to keep startup fast if model load fails) ──
    try:
        import easyocr
        ocr_reader = easyocr.Reader(["en"], gpu=False, verbose=False)
        print("  EasyOCR reader loaded (English, CPU)")
    except Exception as e:
        print(f"[FATAL] Failed to initialize EasyOCR: {e}")
        sys.exit(1)

    # ── Prepare output video writer ──────────────────────────────────
    output_path = build_output_path(video_path)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out_fps = fps / FRAME_SAMPLE_INTERVAL
    writer = cv2.VideoWriter(output_path, fourcc, out_fps, (width, height))

    if not writer.isOpened():
        print(f"[ERROR] Could not create output video writer at: {output_path}")
        cap.release()
        sys.exit(1)

    # ── Storage ──────────────────────────────────────────────────────
    all_detections = []
    track_frames = defaultdict(list)       # track_id → list of detection dicts
    track_plate_readings = defaultdict(list)  # track_id → list of plate reading dicts

    # Counters for edge-case logging
    stats = {
        "total_vehicle_dets": 0,
        "plate_attempts": 0,
        "plates_found": 0,
        "ocr_readable": 0,
        "crop_skipped": 0,
        "plate_too_small": 0,
        "ocr_errors": 0,
    }

    # ── Process video ────────────────────────────────────────────────
    frame_idx = 0
    frames_processed = 0
    start_time = time.time()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % FRAME_SAMPLE_INTERVAL != 0:
            frame_idx += 1
            continue

        timestamp_sec = frame_idx / fps
        frame_h, frame_w = frame.shape[:2]

        # ── Step 1: Vehicle detection + tracking ─────────────────────
        results = vehicle_model.track(
            source=frame,
            persist=True,
            tracker="bytetrack.yaml",
            device="cpu",
            conf=VEHICLE_CONF_THRESHOLD,
            classes=list(VEHICLE_CLASS_IDS),
            verbose=False,
        )

        frame_detections = []
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

                det = {
                    "track_id": tid,
                    "class_name": class_name,
                    "confidence": conf,
                    "x1": float(x1), "y1": float(y1),
                    "x2": float(x2), "y2": float(y2),
                    "frame_number": frame_idx,
                    "timestamp_sec": round(timestamp_sec, 3),
                    # Plate fields (filled in Step 2)
                    "plate_x1": None, "plate_y1": None,
                    "plate_x2": None, "plate_y2": None,
                    "plate_ocr_text": "",
                }

                stats["total_vehicle_dets"] += 1

                # ── Step 2: Plate detection + OCR on vehicle crop ────
                # Clamp vehicle bbox to frame boundaries
                vx1 = max(0, int(x1))
                vy1 = max(0, int(y1))
                vx2 = min(frame_w, int(x2))
                vy2 = min(frame_h, int(y2))

                plate_reading = {
                    "plate_detected": False,
                    "ocr_text": None,
                    "ocr_confidence": 0.0,
                }

                if vx2 - vx1 < 5 or vy2 - vy1 < 5:
                    # Vehicle crop too small / at frame edge
                    stats["crop_skipped"] += 1
                else:
                    vehicle_crop = frame[vy1:vy2, vx1:vx2]
                    stats["plate_attempts"] += 1

                    plate_result = detect_plate_in_crop(plate_model, vehicle_crop)

                    if plate_result is not None:
                        px1_rel, py1_rel, px2_rel, py2_rel, plate_conf = plate_result
                        stats["plates_found"] += 1
                        plate_reading["plate_detected"] = True

                        # Convert plate coords to full-frame coordinates
                        px1_abs = vx1 + px1_rel
                        py1_abs = vy1 + py1_rel
                        px2_abs = vx1 + px2_rel
                        py2_abs = vy1 + py2_rel

                        det["plate_x1"] = px1_abs
                        det["plate_y1"] = py1_abs
                        det["plate_x2"] = px2_abs
                        det["plate_y2"] = py2_abs

                        # Check plate crop size
                        pw = px2_rel - px1_rel
                        ph = py2_rel - py1_rel

                        if pw < MIN_PLATE_WIDTH or ph < MIN_PLATE_HEIGHT:
                            stats["plate_too_small"] += 1
                            # Plate too small for OCR
                            plate_reading["ocr_text"] = None
                        else:
                            # Crop plate from vehicle crop
                            plate_crop = vehicle_crop[
                                max(0, py1_rel):py2_rel,
                                max(0, px1_rel):px2_rel,
                            ]

                            if plate_crop.size == 0:
                                stats["crop_skipped"] += 1
                                plate_reading["ocr_text"] = None
                            else:
                                raw_text, ocr_conf = run_ocr_on_plate(
                                    ocr_reader, plate_crop
                                )

                                if raw_text is not None:
                                    stats["ocr_readable"] += 1
                                    plate_reading["ocr_text"] = raw_text
                                    plate_reading["ocr_confidence"] = ocr_conf
                                    det["plate_ocr_text"] = raw_text

                # Store plate reading for this track
                if tid is not None:
                    track_plate_readings[tid].append(plate_reading)

                frame_detections.append(det)
                all_detections.append(det)

                if tid is not None:
                    track_frames[tid].append(det)

        # ── Draw annotations and write frame ─────────────────────────
        annotated_frame = draw_annotations(frame.copy(), frame_detections)
        writer.write(annotated_frame)

        frames_processed += 1

        if frames_processed % 10 == 0:
            elapsed = time.time() - start_time
            print(f"  Processed {frames_processed} frames "
                  f"(frame {frame_idx}/{total_frames}, "
                  f"{elapsed:.1f}s elapsed, "
                  f"plates found: {stats['plates_found']}, "
                  f"OCR readable: {stats['ocr_readable']})")

        frame_idx += 1

    # ── Cleanup video I/O ────────────────────────────────────────────
    cap.release()
    writer.release()
    elapsed_total = time.time() - start_time

    # ── Build per-track summaries with plate info ────────────────────
    track_summaries = []

    for tid in sorted(track_frames.keys()):
        dets = track_frames[tid]
        timestamps = [d["timestamp_sec"] for d in dets]
        first_seen = min(timestamps)
        last_seen = max(timestamps)
        dwell = round(last_seen - first_seen, 3)

        # Dominant vehicle class
        class_counts = defaultdict(int)
        for d in dets:
            class_counts[d["class_name"]] += 1
        dominant_class = max(class_counts, key=class_counts.get)

        # Plate aggregation
        readings = track_plate_readings.get(tid, [])
        plate_info = aggregate_plate_results(readings)

        summary = {
            "track_id": tid,
            "class_name": dominant_class,
            "first_seen_sec": first_seen,
            "last_seen_sec": last_seen,
            "dwell_sec": dwell,
            "num_frames": len(dets),
            "avg_confidence": round(
                sum(d["confidence"] for d in dets) / len(dets), 3
            ),
            **plate_info,
        }
        track_summaries.append(summary)

    # ── Print results ────────────────────────────────────────────────
    print(f"\n{'='*70}")
    print(f"  RESULTS")
    print(f"{'='*70}")
    print(f"  Frames processed     : {frames_processed}")
    print(f"  Processing time      : {elapsed_total:.1f}s")
    print(f"  Total vehicle dets   : {stats['total_vehicle_dets']}")
    print(f"  Unique vehicle tracks: {len(track_summaries)}")
    print(f"  Output video         : {output_path}")
    print()
    print(f"  Plate Detection Stats:")
    print(f"    Plate attempts     : {stats['plate_attempts']}")
    print(f"    Plates found       : {stats['plates_found']}")
    print(f"    OCR readable       : {stats['ocr_readable']}")
    print(f"    Crop skipped (edge): {stats['crop_skipped']}")
    print(f"    Plate too small    : {stats['plate_too_small']}")
    print(f"    OCR errors         : {stats['ocr_errors']}")

    if len(track_summaries) == 0:
        print(f"\n  0 vehicle tracks found.")
    else:
        # Header
        print(f"\n  {'ID':>4}  {'Class':<10}  {'First':>6}  {'Last':>6}  "
              f"{'Dwell':>6}  {'Frm':>4}  {'Plate Status':<12}  "
              f"{'Plate Text':<18}  {'PConf':>5}  {'PFrm':>4}  {'RdFrm':>5}")
        print(f"  {'-'*4}  {'-'*10}  {'-'*6}  {'-'*6}  "
              f"{'-'*6}  {'-'*4}  {'-'*12}  "
              f"{'-'*18}  {'-'*5}  {'-'*4}  {'-'*5}")

        for s in track_summaries:
            p_conf_str = f"{s['plate_confidence']:.2f}" if s['plate_confidence'] > 0 else "N/A"
            p_text = s["plate_text"] if s["plate_text"] else "N/A"
            if len(p_text) > 18:
                p_text = p_text[:17] + "…"

            print(
                f"  {s['track_id']:>4}  {s['class_name']:<10}  "
                f"{s['first_seen_sec']:>6.1f}  {s['last_seen_sec']:>6.1f}  "
                f"{s['dwell_sec']:>6.1f}  {s['num_frames']:>4}  "
                f"{s['plate_status']:<12}  {p_text:<18}  "
                f"{p_conf_str:>5}  "
                f"{s['frames_with_plate']:>4}  "
                f"{s['frames_with_readable_text']:>5}"
            )

    print(f"\n{'='*70}")
    print(f"  Done!")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    main()
