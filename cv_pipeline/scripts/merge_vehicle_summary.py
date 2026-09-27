"""
merge_vehicle_summary.py — Cross-camera vehicle identity merge for GridWatch.

Reads /output/sightings.json (produced by export_sightings.py) and
/cv_pipeline/registered_vehicles.json, groups sightings into unique vehicle
identities using fuzzy plate-text matching, computes cumulative dwell time
and alert status, and exports /output/vehicle_summary.json.

Identity is established ONLY via plate text — never visual re-identification.

Usage:
    python scripts/merge_vehicle_summary.py
"""

import os
import sys
import json
import shutil
from collections import defaultdict

# Force UTF-8 output on Windows to avoid cp1252 encoding errors with
# box-drawing / emoji characters used in the console summary.
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

SIGHTINGS_PATH = os.path.join(OUTPUT_DIR, "sightings.json")
REGISTERED_VEHICLES_PATH = os.path.join(PROJECT_DIR, "registered_vehicles.json")
VEHICLE_SUMMARY_PATH = os.path.join(OUTPUT_DIR, "vehicle_summary.json")
REGISTERED_COPY_PATH = os.path.join(OUTPUT_DIR, "registered_vehicles_normalized.json")

# ─────────────────────────────────────────────────────────────────────
# TUNABLE CONSTANTS
# ─────────────────────────────────────────────────────────────────────

# Maximum Levenshtein edit-distance to treat two normalized plates as the
# same vehicle.  1 handles common single-char OCR confusions (O↔0, I↔1, …).
FUZZY_MATCH_MAX_DISTANCE = 1

# Two-stage dwell-time thresholds for unregistered vehicles.
# Brief pass-throughs below DWELL_VERIFY_THRESHOLD_SEC get alert_status "none"
# so they don't spam the frontend's Active Alerts panel.
# In a real deployment both values would be much longer (e.g. 60 / 300 s).
DWELL_VERIFY_THRESHOLD_SEC = 10   # minimum cumulative dwell to trigger "pending_verification"
DWELL_ALERT_THRESHOLD_SEC = 20    # minimum cumulative dwell to escalate to "unresolved_alert"


# ─────────────────────────────────────────────────────────────────────
# LEVENSHTEIN DISTANCE  (stdlib-only, no extra deps)
# ─────────────────────────────────────────────────────────────────────
def _levenshtein(a: str, b: str) -> int:
    """Classic DP Levenshtein distance — O(n·m) time, O(min(n,m)) space."""
    if len(a) < len(b):
        return _levenshtein(b, a)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a):
        curr = [i + 1]
        for j, cb in enumerate(b):
            cost = 0 if ca == cb else 1
            curr.append(min(curr[j] + 1, prev[j + 1] + 1, prev[j] + cost))
        prev = curr
    return prev[-1]


def normalize_plate(text: str) -> str:
    """Upper-case and strip hyphens/spaces for comparison."""
    if not text:
        return ""
    return text.upper().replace("-", "").replace(" ", "")


# ─────────────────────────────────────────────────────────────────────
# FILE LOADERS
# ─────────────────────────────────────────────────────────────────────

def load_sightings() -> list:
    """Load sightings.json, exit gracefully on error."""
    if not os.path.isfile(SIGHTINGS_PATH):
        print(f"\n✖ FATAL: sightings.json not found at {SIGHTINGS_PATH}")
        print("  Run export_sightings.py first to generate sightings data.")
        sys.exit(1)
    try:
        with open(SIGHTINGS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"\n✖ FATAL: sightings.json is malformed JSON — {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✖ FATAL: Could not read sightings.json — {e}")
        sys.exit(1)
    if not isinstance(data, list):
        print(f"\n✖ FATAL: sightings.json root must be a JSON array, got {type(data).__name__}")
        sys.exit(1)
    if len(data) == 0:
        print("\n⚠ WARNING: sightings.json is an empty array — nothing to merge.")
    return data


def load_registered_vehicles() -> list:
    """Load registered_vehicles.json; return [] if missing/empty."""
    if not os.path.isfile(REGISTERED_VEHICLES_PATH):
        print(f"  ℹ registered_vehicles.json not found at {REGISTERED_VEHICLES_PATH}")
        print("    → All vehicles will be treated as unregistered.")
        return []
    try:
        with open(REGISTERED_VEHICLES_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, Exception) as e:
        print(f"  ⚠ WARNING: Could not parse registered_vehicles.json — {e}")
        print("    → All vehicles will be treated as unregistered.")
        return []
    if not isinstance(data, list):
        print("  ⚠ WARNING: registered_vehicles.json root is not a JSON array.")
        print("    → All vehicles will be treated as unregistered.")
        return []
    return data


# ─────────────────────────────────────────────────────────────────────
# FUZZY PLATE GROUPING
# ─────────────────────────────────────────────────────────────────────

def _avg_confidence(sightings: list) -> float:
    """Average plate_confidence across sightings (0.0 if all null)."""
    vals = [s.get("plate_confidence") or 0.0 for s in sightings]
    return sum(vals) / len(vals) if vals else 0.0


def group_readable_sightings(readable: list, fuzzy_warnings: list) -> dict:
    """
    Group readable sightings by fuzzy-matching normalized plate text.

    Returns dict mapping canonical_plate_text → list[sighting].
    Populates `fuzzy_warnings` with human-readable warning strings.
    """
    # Phase 1: bucket by EXACT normalized plate
    exact_buckets: dict[str, list] = defaultdict(list)
    # Map normalized → best original string seen so far
    norm_to_original: dict[str, str] = {}

    for s in readable:
        raw = s.get("plate_text", "") or ""
        norm = normalize_plate(raw)
        if not norm:
            continue
        exact_buckets[norm].append(s)
        # Keep the original string with the highest confidence for display
        existing = norm_to_original.get(norm)
        if existing is None:
            norm_to_original[norm] = raw
        else:
            # Prefer the version with higher confidence
            old_conf = max(
                (ss.get("plate_confidence") or 0.0)
                for ss in exact_buckets[norm]
                if (ss.get("plate_text") or "") == existing
            )
            new_conf = s.get("plate_confidence") or 0.0
            if new_conf > old_conf:
                norm_to_original[norm] = raw

    # Phase 2: merge buckets that are within FUZZY_MATCH_MAX_DISTANCE
    # Build list of cluster representatives
    clusters: list[set[str]] = []  # each set contains normalized keys
    norm_keys = list(exact_buckets.keys())

    for nk in norm_keys:
        merged = False
        for cluster in clusters:
            for member in cluster:
                if _levenshtein(nk, member) <= FUZZY_MATCH_MAX_DISTANCE:
                    cluster.add(nk)
                    merged = True
                    break
            if merged:
                break
        if not merged:
            clusters.append({nk})

    # Phase 3: for each cluster, pick canonical plate and merge sightings
    grouped: dict[str, list] = {}
    for cluster in clusters:
        # Collect all sightings in this cluster
        all_sightings = []
        for nk in cluster:
            all_sightings.extend(exact_buckets[nk])

        # Pick canonical: the normalized key whose sightings have the best
        # average plate_confidence (then most sightings as tiebreaker)
        best_norm = max(
            cluster,
            key=lambda nk: (_avg_confidence(exact_buckets[nk]), len(exact_buckets[nk]))
        )
        canonical_original = norm_to_original[best_norm]

        # Emit fuzzy-merge warnings for any cluster with >1 distinct normalized key
        if len(cluster) > 1:
            others = cluster - {best_norm}
            for other_norm in others:
                other_original = norm_to_original[other_norm]
                msg = (
                    f"  ⚠ FUZZY MERGE: \"{other_original}\" (norm: {other_norm}) "
                    f"→ merged into \"{canonical_original}\" (norm: {best_norm})  "
                    f"[edit-distance={_levenshtein(best_norm, other_norm)}]"
                )
                fuzzy_warnings.append(msg)
                print(msg)

        grouped[canonical_original] = all_sightings

    return grouped


# ─────────────────────────────────────────────────────────────────────
# REGISTRATION CHECK
# ─────────────────────────────────────────────────────────────────────

def build_registration_lookup(registered: list) -> dict:
    """
    Build normalized-plate → owner_label lookup.
    Returns dict[normalized_plate, owner_label].
    """
    lookup: dict[str, str] = {}
    for entry in registered:
        pt = entry.get("plate_text", "") or ""
        norm = normalize_plate(pt)
        if norm:
            lookup[norm] = entry.get("owner_label", "")
    return lookup


def is_registered(vehicle_key: str, reg_lookup: dict) -> bool:
    """
    Check if a plate-based vehicle_key matches any registered vehicle.
    Uses exact match first, then fuzzy match within FUZZY_MATCH_MAX_DISTANCE.
    If it fuzzy-matches TWO different registered vehicles, picks the closer one
    and logs a warning.
    """
    norm_key = normalize_plate(vehicle_key)
    if not norm_key:
        return False

    # Exact match
    if norm_key in reg_lookup:
        return True

    # Fuzzy match
    candidates = []
    for reg_norm, owner in reg_lookup.items():
        dist = _levenshtein(norm_key, reg_norm)
        if dist <= FUZZY_MATCH_MAX_DISTANCE:
            candidates.append((dist, reg_norm, owner))

    if not candidates:
        return False

    candidates.sort(key=lambda x: x[0])
    if len(candidates) > 1 and candidates[0][0] == candidates[1][0]:
        print(
            f"  ⚠ WARNING: Plate \"{vehicle_key}\" fuzzy-matches multiple registered "
            f"vehicles at distance {candidates[0][0]}:"
        )
        for dist, rn, owner in candidates:
            print(f"      → \"{owner}\" (plate norm: {rn})")
        print(f"    → Using closest match: \"{candidates[0][2]}\"")

    return True


# ─────────────────────────────────────────────────────────────────────
# VEHICLE SUMMARY BUILDER
# ─────────────────────────────────────────────────────────────────────

def best_snapshot(sightings: list) -> str:
    """Pick snapshot_url from the sighting with highest plate_confidence."""
    best = None
    best_conf = -1.0
    for s in sightings:
        conf = s.get("plate_confidence")
        if conf is not None and conf > best_conf:
            best_conf = conf
            best = s
    if best is None and sightings:
        best = sightings[0]
    return best.get("snapshot_url", "") if best else ""


def build_vehicle_summary(sightings: list, registered: list) -> tuple:
    """
    Core merge logic.  Returns (vehicle_summary_list, fuzzy_warnings, cross_camera_vehicles).
    """
    fuzzy_warnings: list[str] = []
    cross_camera: list[dict] = []  # for console summary

    reg_lookup = build_registration_lookup(registered)

    # Split sightings by plate_status
    readable = [s for s in sightings if s.get("plate_status") == "readable"]
    non_readable = [s for s in sightings if s.get("plate_status") in ("unreadable", "no_plate")]

    print(f"\n  Sighting counts: {len(readable)} readable, {len(non_readable)} unreadable/no_plate")

    # ── Group readable sightings by fuzzy plate match ──
    plate_groups = group_readable_sightings(readable, fuzzy_warnings)

    # ── Build summary entries ──
    summary: list[dict] = []

    # Plate-based vehicle_keys (cross-camera capable)
    for canonical_plate, group_sightings in plate_groups.items():
        # Sort sightings by first_seen_sec
        group_sightings.sort(key=lambda s: s.get("first_seen_sec", 0.0))

        sighting_ids = [s["id"] for s in group_sightings]
        if not sighting_ids:
            print(f"  ⚠ WARNING: Empty sighting_ids for plate group \"{canonical_plate}\" — skipping.")
            continue

        cumulative_dwell = round(
            sum(s.get("dwell_sec", 0.0) for s in group_sightings), 1
        )
        reg = is_registered(canonical_plate, reg_lookup)

        # Alert status (two-stage dwell threshold)
        if reg:
            alert = "none"
        elif cumulative_dwell >= DWELL_ALERT_THRESHOLD_SEC:
            alert = "unresolved_alert"
        elif cumulative_dwell >= DWELL_VERIFY_THRESHOLD_SEC:
            alert = "pending_verification"
        else:
            alert = "none"

        entry = {
            "vehicle_key": canonical_plate,
            "registered": reg,
            "cumulative_dwell_sec": cumulative_dwell,
            "sighting_ids": sighting_ids,
            "alert_status": alert,
            "alert_snapshot_url": best_snapshot(group_sightings),
        }
        summary.append(entry)

        # Check for cross-camera match
        camera_ids = sorted(set(s.get("camera_id", "") for s in group_sightings))
        if len(camera_ids) > 1:
            cross_camera.append({
                "vehicle_key": canonical_plate,
                "camera_ids": camera_ids,
                "cumulative_dwell_sec": cumulative_dwell,
            })

    # Non-readable sightings — each is its own vehicle_key
    for s in non_readable:
        cam_id = s.get("camera_id", "unknown")
        trk_id = s.get("track_id", "unknown")
        vk = f"{cam_id}-{trk_id}"

        sighting_ids = [s["id"]]
        if not sighting_ids or not sighting_ids[0]:
            print(f"  ⚠ WARNING: Missing sighting id for {vk} — skipping.")
            continue

        cumulative_dwell = round(s.get("dwell_sec", 0.0), 1)

        # Unreadable/no_plate are never registered (two-stage dwell threshold)
        if cumulative_dwell >= DWELL_ALERT_THRESHOLD_SEC:
            alert = "unresolved_alert"
        elif cumulative_dwell >= DWELL_VERIFY_THRESHOLD_SEC:
            alert = "pending_verification"
        else:
            alert = "none"

        entry = {
            "vehicle_key": vk,
            "registered": False,
            "cumulative_dwell_sec": cumulative_dwell,
            "sighting_ids": sighting_ids,
            "alert_status": alert,
            "alert_snapshot_url": s.get("snapshot_url", ""),
        }
        summary.append(entry)

    return summary, fuzzy_warnings, cross_camera


# ─────────────────────────────────────────────────────────────────────
# CONSOLE SUMMARY
# ─────────────────────────────────────────────────────────────────────

def print_summary(summary: list, fuzzy_warnings: list, cross_camera: list):
    """Print a human-readable console recap."""
    plate_based = [v for v in summary if "-" not in v["vehicle_key"] or
                   not any(v["vehicle_key"].startswith(f"cam-") and "-trk-" in v["vehicle_key"]
                           for _ in [None])]
    # More robust check: plate-based keys don't follow the "cam-XXX-trk-YYY" pattern
    plate_keys = []
    local_keys = []
    for v in summary:
        vk = v["vehicle_key"]
        # Camera-local keys always contain both a camera_id prefix and "-trk-"
        if "-trk-" in vk:
            local_keys.append(v)
        else:
            plate_keys.append(v)

    total = len(summary)
    n_plate = len(plate_keys)
    n_local = len(local_keys)

    print("\n" + "═" * 60)
    print("  VEHICLE SUMMARY — MERGE RESULTS")
    print("═" * 60)
    print(f"\n  Total unique vehicle_keys: {total}")
    print(f"    ├─ Plate-based (cross-camera capable): {n_plate}")
    print(f"    └─ Unreadable/no_plate (camera-local):  {n_local}")

    # Cross-camera matches — the showcase feature
    print(f"\n  ── Cross-Camera Matches ({len(cross_camera)}) ──")
    if cross_camera:
        for cc in cross_camera:
            cam_list = ", ".join(cc["camera_ids"])
            print(f"    ★ {cc['vehicle_key']}  →  cameras: [{cam_list}]  "
                  f"cumulative dwell: {cc['cumulative_dwell_sec']}s")
    else:
        print("    (none found — add more camera videos for cross-camera demo)")

    # Fuzzy-merge warnings
    print(f"\n  ── Fuzzy-Merge Warnings ({len(fuzzy_warnings)}) ──")
    if fuzzy_warnings:
        for w in fuzzy_warnings:
            print(f"  {w}")
    else:
        print("    (no fuzzy merges were needed)")

    # Alert status distribution
    counts = defaultdict(int)
    for v in summary:
        counts[v["alert_status"]] += 1
    print(f"\n  ── Alert Status Distribution ──")
    for status in ("none", "pending_verification", "unresolved_alert"):
        print(f"    {status}: {counts.get(status, 0)}")

    print("\n" + "═" * 60)


# ─────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────

def main():
    print("\n┌─────────────────────────────────────────────────┐")
    print("│  GridWatch — merge_vehicle_summary.py           │")
    print("└─────────────────────────────────────────────────┘")

    # Load inputs
    sightings = load_sightings()
    if not sightings:
        print("  Nothing to merge (0 sightings). Exiting.")
        sys.exit(0)

    registered = load_registered_vehicles()

    # Run merge
    summary, fuzzy_warnings, cross_camera = build_vehicle_summary(sightings, registered)

    if not summary:
        print("  ⚠ No vehicle entries produced — nothing to export.")
        sys.exit(0)

    # ── Export vehicle_summary.json ──
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(VEHICLE_SUMMARY_PATH, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    print(f"\n  ✔ Exported {len(summary)} vehicle entries → {VEHICLE_SUMMARY_PATH}")

    # ── Export registered_vehicles_normalized.json (convenience copy) ──
    try:
        shutil.copy2(REGISTERED_VEHICLES_PATH, REGISTERED_COPY_PATH)
        print(f"  ✔ Copied registered_vehicles.json → {REGISTERED_COPY_PATH}")
    except FileNotFoundError:
        # If source file doesn't exist, write an empty array
        with open(REGISTERED_COPY_PATH, "w", encoding="utf-8") as f:
            json.dump([], f, indent=2)
        print(f"  ✔ Wrote empty registered_vehicles_normalized.json → {REGISTERED_COPY_PATH}")

    # ── Console summary ──
    print_summary(summary, fuzzy_warnings, cross_camera)

    print(f"\n  Output ready at: {VEHICLE_SUMMARY_PATH}")
    print("  Copy vehicle_summary.json and registered_vehicles_normalized.json")
    print("  into the frontend /public/data/ folder for the demo.\n")


if __name__ == "__main__":
    main()
