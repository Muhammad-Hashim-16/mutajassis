"""
build_frontend_bundle.py — Master runner & packager for GridWatch frontend.

Runs the full CV pipeline (or just the merge step with --skip-cv), then
assembles /output/frontend_bundle/ mirroring the Next.js frontend layout:

    frontend_bundle/
    ├── mock-data/
    │   ├── cameras.json
    │   ├── registered_vehicles.json
    │   ├── sightings.json
    │   └── vehicle_summary.json
    └── public/
        ├── sample-videos/
        │   └── <video files from sample_data/>
        └── snapshots/
            └── <*.jpg from output/snapshots/>

Usage:
    python scripts/build_frontend_bundle.py            # full pipeline
    python scripts/build_frontend_bundle.py --skip-cv  # reuse existing sightings
"""

import os
import sys
import json
import shutil
import subprocess
import argparse
from collections import defaultdict

# Force UTF-8 output on Windows to avoid cp1252 encoding errors.
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if sys.stderr.encoding and sys.stderr.encoding.lower() != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ─────────────────────────────────────────────────────────────────────
# PATH SETUP
# ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
OUTPUT_DIR = os.path.join(PROJECT_DIR, "output")
SAMPLE_DATA_DIR = os.path.join(PROJECT_DIR, "sample_data")
CAMERAS_CONFIG_PATH = os.path.join(PROJECT_DIR, "cameras_config.json")

# Pipeline scripts
EXPORT_SCRIPT = os.path.join(SCRIPT_DIR, "export_sightings.py")
MERGE_SCRIPT = os.path.join(SCRIPT_DIR, "merge_vehicle_summary.py")

# Source files produced by the pipeline
SIGHTINGS_PATH = os.path.join(OUTPUT_DIR, "sightings.json")
CAMERAS_PATH = os.path.join(OUTPUT_DIR, "cameras.json")
VEHICLE_SUMMARY_PATH = os.path.join(OUTPUT_DIR, "vehicle_summary.json")
REGISTERED_COPY_PATH = os.path.join(OUTPUT_DIR, "registered_vehicles_normalized.json")
SNAPSHOTS_DIR = os.path.join(OUTPUT_DIR, "snapshots")

# Bundle output
BUNDLE_DIR = os.path.join(OUTPUT_DIR, "frontend_bundle")
BUNDLE_MOCK_DATA = os.path.join(BUNDLE_DIR, "mock-data")
BUNDLE_PUBLIC = os.path.join(BUNDLE_DIR, "public")
BUNDLE_VIDEOS = os.path.join(BUNDLE_PUBLIC, "sample-videos")
BUNDLE_SNAPSHOTS = os.path.join(BUNDLE_PUBLIC, "snapshots")


# ─────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────

def run_script(script_path: str, label: str) -> bool:
    """Run a Python script as a subprocess. Returns True on success."""
    print(f"\n  ▶ Running {label}...")
    print(f"    {sys.executable} {script_path}")
    result = subprocess.run(
        [sys.executable, script_path],
        cwd=PROJECT_DIR,
    )
    if result.returncode != 0:
        print(f"\n  ✖ FAILED: {label} exited with code {result.returncode}")
        return False
    print(f"  ✔ {label} completed successfully.")
    return True


def load_json(path: str):
    """Load and return parsed JSON, or None on error."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────────────
# STAGE 1: RUN PIPELINE SCRIPTS
# ─────────────────────────────────────────────────────────────────────

def run_pipeline(skip_cv: bool):
    """Run export_sightings.py (unless --skip-cv) then merge_vehicle_summary.py."""
    if skip_cv:
        print("\n  ℹ --skip-cv: Skipping export_sightings.py (reusing existing output)")
        if not os.path.isfile(SIGHTINGS_PATH):
            print(f"\n  ✖ FATAL: Cannot skip CV — sightings.json does not exist yet.")
            print(f"    Path: {SIGHTINGS_PATH}")
            print(f"    Run without --skip-cv first to generate sightings data.")
            sys.exit(1)
    else:
        if not run_script(EXPORT_SCRIPT, "export_sightings.py"):
            print("\n  ✖ Pipeline aborted: export_sightings.py failed.")
            sys.exit(1)

    if not run_script(MERGE_SCRIPT, "merge_vehicle_summary.py"):
        print("\n  ✖ Pipeline aborted: merge_vehicle_summary.py failed.")
        sys.exit(1)


# ─────────────────────────────────────────────────────────────────────
# STAGE 2: ASSEMBLE BUNDLE
# ─────────────────────────────────────────────────────────────────────

def assemble_bundle():
    """Create /output/frontend_bundle/ with the Next.js-ready file layout."""
    print("\n" + "─" * 60)
    print("  ASSEMBLING FRONTEND BUNDLE")
    print("─" * 60)

    # Clean previous bundle
    if os.path.isdir(BUNDLE_DIR):
        shutil.rmtree(BUNDLE_DIR)
        print(f"  ✔ Cleaned previous bundle at {BUNDLE_DIR}")

    # Create directory structure
    os.makedirs(BUNDLE_MOCK_DATA, exist_ok=True)
    os.makedirs(BUNDLE_VIDEOS, exist_ok=True)
    os.makedirs(BUNDLE_SNAPSHOTS, exist_ok=True)

    # ── Copy JSON files into mock-data/ ──
    json_copies = [
        (CAMERAS_PATH,          os.path.join(BUNDLE_MOCK_DATA, "cameras.json")),
        (REGISTERED_COPY_PATH,  os.path.join(BUNDLE_MOCK_DATA, "registered_vehicles.json")),
        (SIGHTINGS_PATH,        os.path.join(BUNDLE_MOCK_DATA, "sightings.json")),
        (VEHICLE_SUMMARY_PATH,  os.path.join(BUNDLE_MOCK_DATA, "vehicle_summary.json")),
    ]
    for src, dst in json_copies:
        if os.path.isfile(src):
            shutil.copy2(src, dst)
            print(f"  ✔ {os.path.basename(src)} → mock-data/")
        else:
            print(f"  ⚠ Missing: {src}")

    # ── Copy video files into public/sample-videos/ ──
    cameras_config = load_json(CAMERAS_CONFIG_PATH)
    if cameras_config and isinstance(cameras_config, list):
        for cam in cameras_config:
            video_file = cam.get("video_file", "")
            if video_file:
                src = os.path.join(SAMPLE_DATA_DIR, video_file)
                dst = os.path.join(BUNDLE_VIDEOS, video_file)
                # Create intermediate dirs if video_file has a subpath
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                if os.path.isfile(src):
                    shutil.copy2(src, dst)
                    print(f"  ✔ {video_file} → public/sample-videos/")
                else:
                    print(f"  ⚠ Video not found: {src}")
    else:
        print(f"  ⚠ Could not load cameras_config.json — no videos copied.")

    # ── Copy snapshot images into public/snapshots/ ──
    snap_count = 0
    if os.path.isdir(SNAPSHOTS_DIR):
        for fname in os.listdir(SNAPSHOTS_DIR):
            if fname.lower().endswith(".jpg"):
                src = os.path.join(SNAPSHOTS_DIR, fname)
                dst = os.path.join(BUNDLE_SNAPSHOTS, fname)
                shutil.copy2(src, dst)
                snap_count += 1
        print(f"  ✔ {snap_count} snapshot(s) → public/snapshots/")
    else:
        print(f"  ⚠ Snapshots directory not found: {SNAPSHOTS_DIR}")


# ─────────────────────────────────────────────────────────────────────
# STAGE 3: POST-BUNDLE VERIFICATION
# ─────────────────────────────────────────────────────────────────────

def verify_bundle() -> bool:
    """
    Run 5 verification checks on the assembled bundle.
    Returns True if all pass.
    """
    print("\n" + "─" * 60)
    print("  POST-BUNDLE VERIFICATION")
    print("─" * 60)

    all_pass = True
    checks_passed = 0
    checks_total = 5

    # ── Check (a): All 4 JSON files exist, valid, non-empty ──
    json_files = {
        "cameras.json":               os.path.join(BUNDLE_MOCK_DATA, "cameras.json"),
        "registered_vehicles.json":   os.path.join(BUNDLE_MOCK_DATA, "registered_vehicles.json"),
        "sightings.json":             os.path.join(BUNDLE_MOCK_DATA, "sightings.json"),
        "vehicle_summary.json":       os.path.join(BUNDLE_MOCK_DATA, "vehicle_summary.json"),
    }
    check_a_ok = True
    for name, path in json_files.items():
        if not os.path.isfile(path):
            print(f"  ✖ [a] MISSING: {name}")
            check_a_ok = False
            continue
        data = load_json(path)
        if data is None:
            print(f"  ✖ [a] INVALID JSON: {name}")
            check_a_ok = False
        elif isinstance(data, list) and len(data) == 0:
            print(f"  ⚠ [a] EMPTY: {name} (0 entries)")
            # Empty registered_vehicles is acceptable, but others are warnings
            if name != "registered_vehicles.json":
                check_a_ok = False

    if check_a_ok:
        print(f"  ✔ [a] All 4 JSON files exist, valid, non-empty")
        checks_passed += 1
    else:
        all_pass = False

    # Load data for remaining checks
    cameras = load_json(json_files["cameras.json"]) or []
    sightings = load_json(json_files["sightings.json"]) or []
    vehicle_summary = load_json(json_files["vehicle_summary.json"]) or []

    # ── Check (b): Every video_url in cameras.json has a physical file ──
    check_b_ok = True
    for cam in cameras:
        video_url = cam.get("video_url", "")
        if not video_url:
            continue
        # video_url is like "/sample-videos/web_ready/Angle_A-converted.mp4"
        # Strip the leading "/sample-videos/" prefix to get the relative path
        prefix = "/sample-videos/"
        if video_url.startswith(prefix):
            rel_path = video_url[len(prefix):]
        else:
            rel_path = os.path.basename(video_url)
        phys_path = os.path.join(BUNDLE_VIDEOS, rel_path)
        if not os.path.isfile(phys_path):
            print(f"  ✖ [b] Missing video: {video_url} → expected at {phys_path}")
            check_b_ok = False

    if check_b_ok:
        print(f"  ✔ [b] All video_url references have physical files")
        checks_passed += 1
    else:
        all_pass = False

    # ── Check (c): Every snapshot_url / alert_snapshot_url has a physical file ──
    check_c_ok = True
    snapshot_urls = set()
    for s in sightings:
        url = s.get("snapshot_url")
        if url:
            snapshot_urls.add(url)
    for v in vehicle_summary:
        url = v.get("alert_snapshot_url")
        if url:
            snapshot_urls.add(url)

    for url in sorted(snapshot_urls):
        fname = os.path.basename(url)
        phys_path = os.path.join(BUNDLE_SNAPSHOTS, fname)
        if not os.path.isfile(phys_path):
            print(f"  ✖ [c] Missing snapshot: {url} → expected at {phys_path}")
            check_c_ok = False

    if check_c_ok:
        print(f"  ✔ [c] All snapshot_url / alert_snapshot_url references have physical files ({len(snapshot_urls)} unique)")
        checks_passed += 1
    else:
        all_pass = False

    # ── Check (d): Every camera_id in sightings.json exists in cameras.json ──
    check_d_ok = True
    known_camera_ids = {cam.get("id") for cam in cameras}
    sighting_camera_ids = {s.get("camera_id") for s in sightings}
    missing_cameras = sighting_camera_ids - known_camera_ids
    if missing_cameras:
        for cid in sorted(missing_cameras):
            print(f"  ✖ [d] Sighting references unknown camera_id: {cid}")
        check_d_ok = False

    if check_d_ok:
        print(f"  ✔ [d] All sighting camera_ids exist in cameras.json")
        checks_passed += 1
    else:
        all_pass = False

    # ── Check (e): Every sighting_id in vehicle_summary exists in sightings ──
    check_e_ok = True
    known_sighting_ids = {s.get("id") for s in sightings}
    for v in vehicle_summary:
        for sid in v.get("sighting_ids", []):
            if sid not in known_sighting_ids:
                print(f"  ✖ [e] vehicle_summary references unknown sighting id: {sid} (vehicle_key: {v.get('vehicle_key')})")
                check_e_ok = False

    if check_e_ok:
        print(f"  ✔ [e] All vehicle_summary sighting_ids exist in sightings.json")
        checks_passed += 1
    else:
        all_pass = False

    # Summary line
    status = "ALL PASS ✔" if all_pass else "SOME FAILED ✖"
    print(f"\n  Verification: {checks_passed}/{checks_total} checks passed — {status}")

    return all_pass


# ─────────────────────────────────────────────────────────────────────
# STAGE 4: DEMO READINESS SUMMARY
# ─────────────────────────────────────────────────────────────────────

def print_demo_summary():
    """Print final demo readiness stats from the bundled data."""
    print("\n" + "═" * 60)
    print("  DEMO READINESS SUMMARY")
    print("═" * 60)

    cameras = load_json(os.path.join(BUNDLE_MOCK_DATA, "cameras.json")) or []
    sightings = load_json(os.path.join(BUNDLE_MOCK_DATA, "sightings.json")) or []
    vehicle_summary = load_json(os.path.join(BUNDLE_MOCK_DATA, "vehicle_summary.json")) or []

    # Basic counts
    print(f"\n  Cameras:           {len(cameras)}")
    print(f"  Sightings:         {len(sightings)}")
    print(f"  Unique vehicles:   {len(vehicle_summary)}")

    # Cross-camera tracked vehicles
    sighting_lookup = {s.get("id"): s for s in sightings}
    cross_camera_count = 0
    for v in vehicle_summary:
        cam_ids = set()
        for sid in v.get("sighting_ids", []):
            s = sighting_lookup.get(sid)
            if s:
                cam_ids.add(s.get("camera_id"))
        if len(cam_ids) >= 2:
            cross_camera_count += 1

    print(f"  Cross-camera tracked: {cross_camera_count}")

    # Alert status distribution
    counts = defaultdict(int)
    for v in vehicle_summary:
        counts[v.get("alert_status", "none")] += 1

    print(f"\n  Alert status breakdown:")
    for status in ("none", "pending_verification", "unresolved_alert"):
        print(f"    {status}: {counts.get(status, 0)}")

    print("\n" + "═" * 60)
    print(f"\n  Bundle ready at: {BUNDLE_DIR}")
    print("  Copy the contents into your Next.js frontend:")
    print(f"    mock-data/*  → frontend/mock-data/")
    print(f"    public/*     → frontend/public/")
    print()


# ─────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="GridWatch — Build frontend bundle from CV pipeline output."
    )
    parser.add_argument(
        "--skip-cv",
        action="store_true",
        help="Skip export_sightings.py (reuse existing sightings) and only re-run merge + bundle."
    )
    args = parser.parse_args()

    print("\n┌─────────────────────────────────────────────────────┐")
    print("│  GridWatch — build_frontend_bundle.py              │")
    print("└─────────────────────────────────────────────────────┘")

    # Stage 1: Run pipeline
    run_pipeline(skip_cv=args.skip_cv)

    # Stage 2: Assemble bundle
    assemble_bundle()

    # Stage 3: Verify bundle
    passed = verify_bundle()

    # Stage 4: Demo summary
    print_demo_summary()

    if not passed:
        print("  ⚠ Some verification checks failed — review warnings above.\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
