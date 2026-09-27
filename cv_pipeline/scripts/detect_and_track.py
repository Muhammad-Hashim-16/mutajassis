"""
detect_and_track.py — Single-video vehicle detection and tracking.

Loads YOLOv8n and runs ByteTrack-based tracking on a video file,
filtering detections to vehicles only (car, motorcycle, bus, truck).
Produces:
  • Console summary of all detected tracks with timing info
  • Annotated output video in /output/ for visual verification

Usage:
    python scripts/detect_and_track.py <path_to_video>
    python scripts/detect_and_track.py                   # uses DEFAULT_VIDEO_PATH
"""

import os
import sys
import time
from collections import defaultdict

# Fix for duplicate OpenMP runtime on Anaconda/Windows
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import cv2
from ultralytics import YOLO

# ─────────────────────────────────────────────────────────────────────
# CONFIGURATION — adjust these as needed
# ─────────────────────────────────────────────────────────────────────

# Process every Nth frame (1 = every frame, 5 = every 5th frame, etc.)
FRAME_SAMPLE_INTERVAL = 5

# Default video path when no CLI argument is provided
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DEFAULT_VIDEO_PATH = os.path.join(PROJECT_DIR, "sample_data", "cctv_video.mp4")

# Output directory for annotated videos
OUTPUT_DIR = os.path.join(PROJECT_DIR, "output")

# YOLOv8 model path (auto-downloads if not present)
MODEL_PATH = "yolov8n.pt"

# COCO class IDs for vehicles we care about
# (COCO: 2=car, 3=motorcycle, 5=bus, 7=truck)
VEHICLE_CLASS_IDS = {2, 3, 5, 7}

# Confidence threshold for detections
CONFIDENCE_THRESHOLD = 0.25

# Annotation colours per class (BGR)
CLASS_COLORS = {
    "car":        (0, 255, 0),     # green
    "motorcycle": (255, 165, 0),   # orange-ish
    "bus":        (255, 0, 0),     # blue
    "truck":      (0, 0, 255),     # red
}
DEFAULT_COLOR = (255, 255, 255)    # white fallback


# ─────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────

def resolve_video_path() -> str:
    """Return video path from CLI arg or default, with existence check."""
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
    return os.path.join(OUTPUT_DIR, f"annotated_{basename}.mp4")


def draw_annotations(frame, detections):
    """
    Draw bounding boxes and labels on a frame.

    `detections` is a list of dicts with keys:
        track_id, class_name, confidence, x1, y1, x2, y2
    """
    for det in detections:
        x1, y1, x2, y2 = int(det["x1"]), int(det["y1"]), int(det["x2"]), int(det["y2"])
        tid = det["track_id"]
        cls = det["class_name"]
        conf = det["confidence"]
        color = CLASS_COLORS.get(cls, DEFAULT_COLOR)

        # Bounding box
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

        # Label background
        label = f"ID:{tid} {cls} {conf:.2f}"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
        cv2.rectangle(frame, (x1, y1 - th - 8), (x1 + tw + 4, y1), color, -1)

        # Label text
        cv2.putText(frame, label, (x1 + 2, y1 - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1, cv2.LINE_AA)

    return frame


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

    # Guard against broken FPS metadata
    if fps <= 0:
        print("[WARNING] Video reports FPS <= 0, defaulting to 25.0")
        fps = 25.0

    print(f"\n{'='*60}")
    print(f"  Vehicle Detection & Tracking")
    print(f"{'='*60}")
    print(f"  Input       : {video_path}")
    print(f"  Resolution  : {width}x{height}")
    print(f"  Total frames: {total_frames}")
    print(f"  FPS         : {fps}")
    print(f"  Duration    : {total_frames / fps:.1f}s")
    print(f"  Sampling    : every {FRAME_SAMPLE_INTERVAL} frame(s)")
    print(f"  Frames to process: ~{total_frames // FRAME_SAMPLE_INTERVAL}")
    print(f"{'='*60}\n")

    # ── Load YOLOv8 model ────────────────────────────────────────────
    print("Loading YOLOv8 model...")
    model = YOLO(MODEL_PATH)
    print(f"  Model loaded: {MODEL_PATH}")

    # ── Prepare output video writer ──────────────────────────────────
    output_path = build_output_path(video_path)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    # Output FPS: effective rate after frame sampling
    out_fps = fps / FRAME_SAMPLE_INTERVAL
    writer = cv2.VideoWriter(output_path, fourcc, out_fps, (width, height))

    if not writer.isOpened():
        print(f"[ERROR] Could not create output video writer at: {output_path}")
        cap.release()
        sys.exit(1)

    # ── Per-frame detection storage ──────────────────────────────────
    all_detections = []                    # flat list of per-detection dicts
    track_frames = defaultdict(list)       # track_id → list of detection dicts

    # ── Process video ────────────────────────────────────────────────
    frame_idx = 0
    frames_processed = 0
    start_time = time.time()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Only process sampled frames
        if frame_idx % FRAME_SAMPLE_INTERVAL != 0:
            frame_idx += 1
            continue

        timestamp_sec = frame_idx / fps

        # Run YOLOv8 tracking with ByteTrack
        # persist=True keeps tracker state across calls
        results = model.track(
            source=frame,
            persist=True,
            tracker="bytetrack.yaml",
            device="cpu",
            conf=CONFIDENCE_THRESHOLD,
            classes=list(VEHICLE_CLASS_IDS),
            verbose=False,
        )

        # Extract detections from this frame
        frame_detections = []
        boxes = results[0].boxes

        if boxes is not None and len(boxes) > 0:
            # .id can be None if tracker hasn't assigned IDs yet
            track_ids = boxes.id
            if track_ids is not None:
                track_ids = track_ids.cpu().numpy().astype(int)
            else:
                track_ids = [None] * len(boxes)

            for i, box in enumerate(boxes):
                cls_id = int(box.cls.item())

                # Double-check class filter (should already be filtered by classes= param)
                if cls_id not in VEHICLE_CLASS_IDS:
                    continue

                class_name = model.names[cls_id]
                conf = float(box.conf.item())
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()

                tid = int(track_ids[i]) if track_ids[i] is not None else None

                det = {
                    "track_id": tid,
                    "class_name": class_name,
                    "confidence": conf,
                    "x1": float(x1),
                    "y1": float(y1),
                    "x2": float(x2),
                    "y2": float(y2),
                    "frame_number": frame_idx,
                    "timestamp_sec": round(timestamp_sec, 3),
                }

                frame_detections.append(det)
                all_detections.append(det)

                if tid is not None:
                    track_frames[tid].append(det)

        # Draw annotations on frame and write to output video
        annotated_frame = draw_annotations(frame.copy(), frame_detections)
        writer.write(annotated_frame)

        frames_processed += 1

        # Progress update every 50 processed frames
        if frames_processed % 50 == 0:
            elapsed = time.time() - start_time
            print(f"  Processed {frames_processed} frames "
                  f"(frame {frame_idx}/{total_frames}, "
                  f"{elapsed:.1f}s elapsed)")

        frame_idx += 1

    # ── Cleanup video I/O ────────────────────────────────────────────
    cap.release()
    writer.release()

    elapsed_total = time.time() - start_time

    # ── Build per-track summaries ────────────────────────────────────
    track_summaries = []

    for tid in sorted(track_frames.keys()):
        dets = track_frames[tid]
        timestamps = [d["timestamp_sec"] for d in dets]
        first_seen = min(timestamps)
        last_seen = max(timestamps)
        dwell = round(last_seen - first_seen, 3)

        # Use most common class across frames for this track
        class_counts = defaultdict(int)
        for d in dets:
            class_counts[d["class_name"]] += 1
        dominant_class = max(class_counts, key=class_counts.get)

        summary = {
            "track_id": tid,
            "class_name": dominant_class,
            "first_seen_sec": first_seen,
            "last_seen_sec": last_seen,
            "dwell_sec": dwell,
            "num_frames": len(dets),
            "avg_confidence": round(sum(d["confidence"] for d in dets) / len(dets), 3),
        }
        track_summaries.append(summary)

    # ── Print results ────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"  RESULTS")
    print(f"{'='*60}")
    print(f"  Frames processed   : {frames_processed}")
    print(f"  Processing time    : {elapsed_total:.1f}s")
    print(f"  Total detections   : {len(all_detections)}")
    print(f"  Unique vehicle tracks: {len(track_summaries)}")
    print(f"  Output video       : {output_path}")

    if len(track_summaries) == 0:
        print(f"\n  0 vehicle tracks found.")
    else:
        print(f"\n  {'ID':>4}  {'Class':<12}  {'First(s)':>8}  {'Last(s)':>8}  "
              f"{'Dwell(s)':>8}  {'Frames':>6}  {'Avg Conf':>8}")
        print(f"  {'-'*4}  {'-'*12}  {'-'*8}  {'-'*8}  {'-'*8}  {'-'*6}  {'-'*8}")

        for s in track_summaries:
            print(f"  {s['track_id']:>4}  {s['class_name']:<12}  "
                  f"{s['first_seen_sec']:>8.2f}  {s['last_seen_sec']:>8.2f}  "
                  f"{s['dwell_sec']:>8.2f}  {s['num_frames']:>6}  "
                  f"{s['avg_confidence']:>8.3f}")

    print(f"\n{'='*60}")
    print(f"  Done!")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
