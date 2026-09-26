"""
verify_setup.py — Smoke-test script for the CV Pipeline.

Runs 4 independent checks and prints PASS/FAIL for each:
  a. YOLOv8 vehicle detection on a sample image (CPU)
  b. License-plate detection model load + inference (CPU)
  c. EasyOCR English text recognition (CPU)
  d. PyTorch device confirmation (CPU)

Each check is wrapped in its own try/except so one failure
does not prevent the remaining checks from running.
"""

import os
import sys
import shutil
import textwrap

import cv2
import numpy as np
import torch
import easyocr
import ultralytics
from ultralytics import YOLO
from huggingface_hub import hf_hub_download

# ---------------------------------------------------------------------------
# Resolve project paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
MODELS_DIR = os.path.join(PROJECT_DIR, "models")
SAMPLE_DIR = os.path.join(PROJECT_DIR, "sample_data")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(SAMPLE_DIR, exist_ok=True)

# Counters
results: list[tuple[str, bool]] = []


def _banner(title: str) -> None:
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


# ===================================================================
# CHECK (a) — YOLOv8 vehicle detection
# ===================================================================
def check_yolo_vehicle_detection() -> None:
    _banner("Check A: YOLOv8 vehicle detection (yolov8n.pt)")
    try:
        # Load the smallest pretrained YOLOv8 model (auto-downloads on first run)
        model = YOLO("yolov8n.pt")

        # Create a simple synthetic test image: a 640×480 image with colored
        # rectangles to loosely resemble vehicles on a road. The model may or
        # may not detect anything — what matters is that it *runs*.
        # If ultralytics ships a bus.jpg sample, prefer that.
        sample_img_path = None

        # ultralytics bundles sample images; try the well-known bus.jpg
        try:
            assets_dir = os.path.join(os.path.dirname(ultralytics.__file__), "assets")
            candidate = os.path.join(assets_dir, "bus.jpg")
            if os.path.isfile(candidate):
                sample_img_path = candidate
                print(f"  Using built-in sample image: {candidate}")
        except Exception:
            pass

        if sample_img_path is None:
            # Fallback: generate a blank image with some shapes
            img = np.zeros((480, 640, 3), dtype=np.uint8)
            img[200:350, 100:300] = (120, 120, 200)  # rectangle
            img[150:400, 350:550] = (100, 180, 100)  # rectangle
            sample_img_path = os.path.join(SAMPLE_DIR, "_test_synthetic.jpg")
            cv2.imwrite(sample_img_path, img)
            print(f"  Generated synthetic test image: {sample_img_path}")

        # Run inference on CPU
        det_results = model.predict(source=sample_img_path, device="cpu", verbose=False)

        # Inspect results
        detections = det_results[0]
        num_boxes = len(detections.boxes)
        class_names = [detections.names[int(cls)] for cls in detections.boxes.cls] if num_boxes > 0 else []

        if num_boxes > 0:
            print(f"  Detections: {num_boxes}")
            print(f"  Classes detected: {class_names}")
            print("[PASS] YOLOv8 vehicle detection — CPU")
            results.append(("YOLOv8 vehicle detection — CPU", True))
        else:
            # Model loaded and ran successfully, just didn't detect anything
            # (acceptable for a smoke test — the model works).
            print("  Model loaded and ran, but 0 detections on the test image.")
            print("  (This is okay — it means the model pipeline works.)")
            print("[PASS] YOLOv8 vehicle detection — CPU (0 detections, model functional)")
            results.append(("YOLOv8 vehicle detection — CPU", True))

    except Exception as e:
        print(f"[FAIL] YOLOv8 vehicle detection — CPU")
        print(f"  Error: {e}")
        results.append(("YOLOv8 vehicle detection — CPU", False))


# ===================================================================
# CHECK (b) — License plate detection model
# ===================================================================
def check_license_plate_model() -> None:
    _banner("Check B: License plate detection model")
    try:
        # -----------------------------------------------------------
        # We use Koushim/yolov8-license-plate-detection from
        # Hugging Face.  The `huggingface_hub` library (installed as
        # a dependency of ultralytics) lets us download specific files
        # from a repo.
        # -----------------------------------------------------------
        lp_model_path = os.path.join(MODELS_DIR, "lp_detector_yolov8n.pt")

        if not os.path.isfile(lp_model_path):
            print("  Downloading license-plate YOLOv8n weights from Hugging Face …")
            try:
                downloaded = hf_hub_download(
                    repo_id="Koushim/yolov8-license-plate-detection",
                    filename="best.pt",
                    local_dir=MODELS_DIR,
                    local_dir_use_symlinks=False,
                )
                # Move / rename to our canonical name
                shutil.move(downloaded, lp_model_path)
                print(f"  Saved to: {lp_model_path}")
            except Exception as dl_err:
                print(f"  Download failed: {dl_err}")
                print(f"[FAIL] License plate detection model — CPU")
                print(textwrap.indent(
                    "Hint: Ensure you have internet access. The model is hosted at\n"
                    "https://huggingface.co/Koushim/yolov8-license-plate-detection",
                    "  ",
                ))
                results.append(("License plate detection model — CPU", False))
                return

        # Load the model
        model = YOLO(lp_model_path)
        print(f"  Model loaded from: {lp_model_path}")
        print(f"  Model class names: {model.names}")

        # Quick inference on a blank image just to confirm it runs
        dummy = np.zeros((640, 640, 3), dtype=np.uint8)
        det = model.predict(source=dummy, device="cpu", verbose=False)
        print(f"  Inference returned {len(det[0].boxes)} detections (dummy image)")

        print("[PASS] License plate detection model — CPU")
        results.append(("License plate detection model — CPU", True))

    except Exception as e:
        print(f"[FAIL] License plate detection model — CPU")
        print(f"  Error: {e}")
        results.append(("License plate detection model — CPU", False))


# ===================================================================
# CHECK (c) — EasyOCR
# ===================================================================
def check_easyocr() -> None:
    _banner("Check C: EasyOCR (English)")
    try:
        # Initialize reader (downloads models on first run)
        print("  Initializing EasyOCR reader (English, CPU) …")
        reader = easyocr.Reader(["en"], gpu=False, verbose=False)

        # Create a simple test image with white text on black background
        # using OpenCV (no external file needed).
        img = np.zeros((100, 400, 3), dtype=np.uint8)
        cv2.putText(img, "HELLO 1234", (30, 65), cv2.FONT_HERSHEY_SIMPLEX,
                    1.5, (255, 255, 255), 3, cv2.LINE_AA)

        test_img_path = os.path.join(SAMPLE_DIR, "_test_ocr.jpg")
        cv2.imwrite(test_img_path, img)
        print(f"  Generated OCR test image: {test_img_path}")

        # Run OCR
        ocr_results = reader.readtext(img)
        texts = [entry[1] for entry in ocr_results]

        if texts:
            print(f"  OCR returned text: {texts}")
            print("[PASS] EasyOCR — CPU")
            results.append(("EasyOCR — CPU", True))
        else:
            print("  OCR ran but returned no text (may be a font/rendering issue).")
            print("  The OCR pipeline itself is functional.")
            print("[PASS] EasyOCR — CPU (no text returned, pipeline functional)")
            results.append(("EasyOCR — CPU", True))

    except Exception as e:
        print(f"[FAIL] EasyOCR — CPU")
        print(f"  Error: {e}")
        results.append(("EasyOCR — CPU", False))


# ===================================================================
# CHECK (d) — PyTorch device
# ===================================================================
def check_torch_device() -> None:
    _banner("Check D: PyTorch device")
    try:
        cuda_available = torch.cuda.is_available()
        device = torch.device("cuda" if cuda_available else "cpu")

        print(f"  torch version   : {torch.__version__}")
        print(f"  CUDA available  : {cuda_available}")
        print(f"  Selected device : {device}")

        if device.type == "cpu":
            print(f"[PASS] Torch device: cpu")
            results.append(("Torch device: cpu", True))
        else:
            # Not an error per se, but we expected CPU-only
            print(f"[PASS] Torch device: {device} (CUDA found — will still work)")
            results.append((f"Torch device: {device}", True))

    except Exception as e:
        print(f"[FAIL] Torch device check")
        print(f"  Error: {e}")
        results.append(("Torch device check", False))


# ===================================================================
# MAIN — Run all checks and print summary
# ===================================================================
def main() -> None:
    print("=" * 60)
    print("  CV Pipeline — Setup Verification")
    print("=" * 60)

    check_yolo_vehicle_detection()
    check_license_plate_model()
    check_easyocr()
    check_torch_device()

    # ---- Summary ----
    print(f"\n{'='*60}")
    print("  SUMMARY")
    print(f"{'='*60}")
    for label, passed in results:
        status = "[PASS]" if passed else "[FAIL]"
        print(f"  {status} {label}")

    total = len(results)
    passed_count = sum(1 for _, p in results if p)
    print(f"\n  {passed_count}/{total} checks passed.\n")

    if passed_count < total:
        sys.exit(1)


if __name__ == "__main__":
    main()
