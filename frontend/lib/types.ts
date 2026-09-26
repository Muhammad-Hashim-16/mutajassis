/**
 * Shared TypeScript types matching the exact Supabase table schemas.
 * Keep field names and types in sync with the backend team.
 */

export interface Camera {
  id: string;
  name: string;
  video_url: string;
}

export interface RegisteredVehicle {
  plate_text: string;
  owner_label: string;
}

export interface Sighting {
  id: string;
  camera_id: string;
  track_id: string;
  plate_text: string | null;
  plate_confidence: number | null;
  plate_status: "readable" | "unreadable" | "no_plate";
  first_seen_sec: number;
  last_seen_sec: number;
  dwell_sec: number;
  snapshot_url: string;
}

export interface VehicleSummary {
  vehicle_key: string;
  registered: boolean;
  cumulative_dwell_sec: number;
  sighting_ids: string[];
  alert_status: "none" | "pending_verification" | "unresolved_alert";
  alert_snapshot_url: string | null;
}
