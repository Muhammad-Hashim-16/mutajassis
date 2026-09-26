# GridWatch — Frontend Project Status & Backend Data Contract

> **Project:** GridWatch — Faisalabad  
> **Repository Directory:** `d:\Project Mutajassis\frontend`  
> **Tech Stack:** Next.js (App Router, Turbopack), TypeScript, Tailwind CSS v4, `next-themes`, `lucide-react`  
> **Prepared For:** Computer Vision & Supabase Backend Pipeline Teammates

---

## 1. Project Overview

**GridWatch** is a residential vehicle awareness platform designed for housing colonies in Faisalabad. In traditional residential areas, individual homeowners install standalone CCTV cameras that operate in total isolation—leaving blind spots and forcing residents to manually review disconnected footage only after an incident occurs. GridWatch connects these independent cameras into a collaborative, automated awareness network. By recognizing license plates as vehicles enter and move through the neighborhood, the system cross-checks plates against a colony registry, correlates sightings across multiple cameras to establish a chronological movement journey, and raises neutral, non-accusatory awareness alerts when an unrecognized vehicle stays in the area for an extended period.

---

## 2. Implemented Pages & Routes

| Route | Page Name | Description & Key Features |
| :--- | :--- | :--- |
| `/` | **Landing Page** | Product overview explaining the problem of isolated CCTVs, a 4-step visual flow (*Cameras Watch → Vehicles Detected → Cross-Checked → Residents Notified*), call-to-actions, hackathon attribution, and team credits. |
| `/dashboard` | **Live Monitoring Dashboard** | Central operational screen featuring three primary sections: (1) **Active Alerts Panel** for pending verification and unresolved alerts with live countdowns, (2) **Monitored Cameras Grid** with live status indicators and graceful offline fallbacks, and (3) **Live Detection Log** streaming vehicle sightings in sync with camera playback. |
| `/timeline` | **Cross-Camera Vehicle Timeline** | The core differentiator: traces a single vehicle's journey across multiple independent cameras. Features a prioritized vehicle selector (auto-selecting vehicles seen at 2+ cameras), a summary card, and a vertical journey stepper with camera locations, timestamps, and dwell times. |
| `/registered` | **Registered Vehicles Registry** | Colony roster of approved resident vehicles. Displays plate numbers and resident/house labels, and provides an interactive registration form with real-time validation and duplicate prevention. |

---

## 3. Component Inventory

| Component File | One-Line Description |
| :--- | :--- |
| [`/components/Logo.tsx`](file:///d:/Project%20Mutajassis/frontend/components/Logo.tsx) | Clean modern SVG logo combining a protective shield with a connected camera grid mesh. |
| [`/components/Navbar.tsx`](file:///d:/Project%20Mutajassis/frontend/components/Navbar.tsx) | Top navigation bar with the GridWatch brand logo, route links, and theme toggle button. |
| [`/components/ThemeToggle.tsx`](file:///d:/Project%20Mutajassis/frontend/components/ThemeToggle.tsx) | Dark/Light theme toggle button with Sun and Moon icons using `next-themes`. |
| [`/components/ThemeProvider.tsx`](file:///d:/Project%20Mutajassis/frontend/components/ThemeProvider.tsx) | Client wrapper providing theme context with hydration mismatch suppression. |
| [`/components/FadeIn.tsx`](file:///d:/Project%20Mutajassis/frontend/components/FadeIn.tsx) | Reusable scroll- and mount-triggered entrance animation wrapper respecting `prefers-reduced-motion`. |
| [`/components/CameraFeedCard.tsx`](file:///d:/Project%20Mutajassis/frontend/components/CameraFeedCard.tsx) | Live camera feed card with looping video playback, pulsing LIVE badge, and calm "Feed unavailable" fallback. |
| [`/components/AlertsPanel.tsx`](file:///d:/Project%20Mutajassis/frontend/components/AlertsPanel.tsx) | Interactive alerts section with a 15s demo countdown, resident verification buttons, and calm "all clear" empty state. |
| [`/components/DetectionLogTable.tsx`](file:///d:/Project%20Mutajassis/frontend/components/DetectionLogTable.tsx) | Scrollable live detection log table with snapshot thumbnail fallbacks, status badges, and timestamp formatting. |
| [`/components/VehicleSummaryCard.tsx`](file:///d:/Project%20Mutajassis/frontend/components/VehicleSummaryCard.tsx) | Detailed sidebar summary card showing plate format, registration status, resident owner, and dwell statistics. |
| [`/components/VehicleTimelineNode.tsx`](file:///d:/Project%20Mutajassis/frontend/components/VehicleTimelineNode.tsx) | Vertical journey step node displaying camera name, snapshot, timestamp, dwell time, and plate match confidence. |
| [`/components/AddVehicleForm.tsx`](file:///d:/Project%20Mutajassis/frontend/components/AddVehicleForm.tsx) | Resident vehicle registration form with uppercase auto-formatting, inline validation, and duplicate prevention. |
| [`/components/RegisteredVehiclesTable.tsx`](file:///d:/Project%20Mutajassis/frontend/components/RegisteredVehiclesTable.tsx) | Colony vehicle roster table displaying plate numbers, owner labels, and green "Registered" badges. |

---

## 4. Exact Data Contract (Backend / Supabase Target)

The frontend's data access layer in [`/lib/data.ts`](file:///d:/Project%20Mutajassis/frontend/lib/data.ts) defines four getter functions that return TypeScript interfaces defined in [`/lib/types.ts`](file:///d:/Project%20Mutajassis/frontend/lib/types.ts). **The CV pipeline and Supabase tables must match these exact field names and types:**

### 4.1 TypeScript Interfaces ([`/lib/types.ts`](file:///d:/Project%20Mutajassis/frontend/lib/types.ts))

```typescript
export interface Camera {
  id: string;          // e.g. "cam-001"
  name: string;        // e.g. "House 14 – Street A"
  video_url: string;   // e.g. "/sample-videos/camera1.mp4" or Supabase Storage URL
}

export interface RegisteredVehicle {
  plate_text: string;  // e.g. "LEA-4521"
  owner_label: string; // e.g. "Ahmed – House 14"
}

export interface Sighting {
  id: string;                                          // e.g. "s-001"
  camera_id: string;                                   // References Camera.id
  track_id: string;                                    // e.g. "trk-a1" from ByteTrack
  plate_text: string | null;                           // e.g. "LEA-4521" or null if unreadable
  plate_confidence: number | null;                     // 0.0 to 1.0 (e.g. 0.94)
  plate_status: "readable" | "unreadable" | "no_plate";// Classification enum
  first_seen_sec: number;                              // In-video timestamp in seconds (e.g. 120)
  last_seen_sec: number;                               // In-video timestamp in seconds (e.g. 185)
  dwell_sec: number;                                   // Dwell duration in seconds (e.g. 65)
  snapshot_url: string;                                // e.g. "/placeholder-snapshots/car1.jpg"
}

export interface VehicleSummary {
  vehicle_key: string;                                      // Plate text (e.g. "LEA-4521") or Track ID
  registered: boolean;                                     // true if in RegisteredVehicle list
  cumulative_dwell_sec: number;                            // Sum of dwell_sec across all sightings
  sighting_ids: string[];                                  // Array of Sighting.id strings
  alert_status: "none" | "pending_verification" | "unresolved_alert";
  alert_snapshot_url: string | null;                       // Image URL for alert banner
}
```

### 4.2 Data Access Layer Signatures ([`/lib/data.ts`](file:///d:/Project%20Mutajassis/frontend/lib/data.ts))

```typescript
export async function getCameras(): Promise<Camera[]>;
export async function getRegisteredVehicles(): Promise<RegisteredVehicle[]>;
export async function getSightings(): Promise<Sighting[]>;
export async function getVehicleSummary(): Promise<VehicleSummary[]>;
```

---

## 5. Local-Only State vs. Real Backend Needs

The frontend currently uses **local-only React component state** (`useState`) for all interactive mutations during the session. These actions do **NOT** persist across page reloads and will need real Supabase mutation endpoints:

1. **Alert Verification Actions ([`components/AlertsPanel.tsx`](file:///d:/Project%20Mutajassis/frontend/components/AlertsPanel.tsx)):**
   - Clicking *"I Recognize This Vehicle"* updates `alert_status` from `"pending_verification"` to `"none"`.
   - Clicking *"I Don't Recognize This"* (or letting the 15s timer expire) escalates `alert_status` to `"unresolved_alert"`.
   - *Backend integration needed:* `UPDATE vehicle_summary SET alert_status = $1 WHERE vehicle_key = $2`.
2. **Vehicle Registration ([`components/AddVehicleForm.tsx`](file:///d:/Project%20Mutajassis/frontend/components/AddVehicleForm.tsx)):**
   - Adding a new vehicle prepends it to the local `vehicles` state list.
   - *Backend integration needed:* `INSERT INTO registered_vehicles (plate_text, owner_label) VALUES ($1, $2)`.

---

## 6. What is Mocked vs. What Needs Real Files

1. **Camera Video URLs (`Camera.video_url`):**
   - Currently point to `/sample-videos/camera1.mp4`, `camera2.mp4`, etc.
   - These files do not exist yet on disk. The frontend's `CameraFeedCard` component detects this via HEAD request and renders a calm **"Feed unavailable"** placeholder state.
   - *What the CV team needs to provide:* Place processed `.mp4` video files into `/public/sample-videos/` or serve them from a Supabase storage bucket, and update the paths in `cameras.json` or the Supabase database.
2. **Sighting & Alert Snapshot URLs (`Sighting.snapshot_url`, `VehicleSummary.alert_snapshot_url`):**
   - Currently point to `/placeholder-snapshots/car1.jpg`, etc.
   - The frontend's thumbnail components catch missing images via `onError` and display a clean `<Car />` icon placeholder.
   - *What the CV team needs to provide:* Real vehicle crop snapshots output by YOLO/OpenCV saved in `/public/placeholder-snapshots/` or a Supabase bucket.

---

## 7. How to Swap Mock Data for Real Supabase Data

Because the frontend uses a strict data abstraction layer in [`/lib/data.ts`](file:///d:/Project%20Mutajassis/frontend/lib/data.ts), **zero page or component code needs to change** when connecting Supabase. Only the internals of the four getter functions in [`/lib/data.ts`](file:///d:/Project%20Mutajassis/frontend/lib/data.ts) need to be updated:

```typescript
// Example future implementation in /lib/data.ts:
import { supabase } from "@/lib/supabaseClient";

export async function getCameras(): Promise<Camera[]> {
  const { data, error } = await supabase.from("cameras").select("*");
  if (error || !data) return [];
  return data as Camera[];
}

export async function getRegisteredVehicles(): Promise<RegisteredVehicle[]> {
  const { data, error } = await supabase.from("registered_vehicles").select("*");
  if (error || !data) return [];
  return data as RegisteredVehicle[];
}

export async function getSightings(): Promise<Sighting[]> {
  const { data, error } = await supabase.from("sightings").select("*");
  if (error || !data) return [];
  return data as Sighting[];
}

export async function getVehicleSummary(): Promise<VehicleSummary[]> {
  const { data, error } = await supabase.from("vehicle_summary").select("*");
  if (error || !data) return [];
  return data as VehicleSummary[];
}
```

---

## 8. Known Limitations & Demo Simplifications

1. **Countdown Timer:** The pending verification countdown timer in `AlertsPanel` is set to **15 seconds** for demo pacing. In a production colony deployment, this threshold would typically be 10–15 minutes before escalating.
2. **Re-Identification Boundary:** Cross-camera tracking is established **exclusively by license plate matching**. If a vehicle has no readable plate (`plate_status === "unreadable"` or `"no_plate"`), it is assigned a temporary `TMP-${track_id}` and is only tracked within that specific camera feed.
3. **Session-Local State:** All user verification and registration actions exist solely in memory for the duration of the browser session.
4. **Dev Mode Indicator:** The circular "N" icon in the bottom-left corner of the screen is Next.js's built-in Turbopack development build indicator and is automatically excluded from production builds (`next build && next start`).
5. **Mobile Responsiveness & Team Credits:** Full mobile responsiveness audited at 360px, 414px, 768px, and 1280px viewports. Features a mobile drawer navigation menu (`components/Navbar.tsx`) with $\ge 44\text{px}$ touch targets, horizontal containment on all tables and panels, and a dedicated "The Team" 2-card section with LinkedIn/GitHub links on the landing page.

