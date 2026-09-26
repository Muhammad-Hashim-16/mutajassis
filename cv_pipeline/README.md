# Neighborhood Vehicle Awareness System — CV Pipeline

A **CPU-only** computer-vision pipeline that processes prerecorded CCTV footage from a residential neighborhood to:

1. **Detect vehicles** using YOLOv8 (`yolov8n.pt`).
2. **Track vehicles per camera** using ByteTrack (bundled with `ultralytics`).
3. **Detect license plates** using a dedicated YOLOv8 license-plate model.
4. **OCR plate text** using EasyOCR.

The pipeline produces structured **JSON / CSV** exports in the `output/` directory.

---

## Project Structure

```
cv_pipeline/
├── models/            # Downloaded model weight files
├── sample_data/       # Test videos / images (add your own)
├── output/            # JSON / CSV exports (generated)
├── scripts/
│   └── verify_setup.py   # Smoke-test script (see below)
├── requirements.txt
└── README.md
```

---

## Setup

### 1. Create & activate a virtual environment

```bash
cd cv_pipeline
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux / macOS
source .venv/bin/activate
```

### 2. Install dependencies (CPU-only PyTorch)

```bash
pip install --upgrade pip
pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu
```

> The `--extra-index-url` flag tells pip to fetch the CPU-only torch/torchvision
> wheels from PyTorch's official CPU channel.

---

## Verification

Run the smoke-test script to confirm every component loads and runs on CPU:

```bash
python scripts/verify_setup.py
```

Expected output:

```
[PASS] YOLOv8 vehicle detection — CPU
[PASS] License plate detection model — CPU
[PASS] EasyOCR — CPU
[PASS] Torch device: cpu
```

Each check runs independently — a `FAIL` in one step will **not** crash the rest;
you will always see all four results.

---

## Notes

- **No GPU required.** All inference runs on CPU.
- **No paid APIs or external services.** Everything is local/offline after
  initial model downloads.
- Model weight files (`.pt`) are downloaded automatically on the first run and
  cached in `models/`.
