/**
 * Data-access abstraction layer.
 *
 * Currently reads from local mock JSON files.
 * When Supabase is ready, swap the implementations below —
 * no page component needs to change.
 */

import type { Camera, RegisteredVehicle, Sighting, VehicleSummary } from "./types";

// ── Cameras ──────────────────────────────────────────────
export async function getCameras(): Promise<Camera[]> {
  try {
    const data = (await import("@/mock-data/cameras.json")).default;
    return data as Camera[];
  } catch {
    console.error("[data] Failed to load cameras.json");
    return [];
  }
}

// ── Registered Vehicles ──────────────────────────────────
export async function getRegisteredVehicles(): Promise<RegisteredVehicle[]> {
  try {
    const data = (await import("@/mock-data/registered_vehicles.json")).default;
    return data as RegisteredVehicle[];
  } catch {
    console.error("[data] Failed to load registered_vehicles.json");
    return [];
  }
}

// ── Sightings ────────────────────────────────────────────
export async function getSightings(): Promise<Sighting[]> {
  try {
    const data = (await import("@/mock-data/sightings.json")).default;
    return data as Sighting[];
  } catch {
    console.error("[data] Failed to load sightings.json");
    return [];
  }
}

// ── Vehicle Summary ──────────────────────────────────────
export async function getVehicleSummary(): Promise<VehicleSummary[]> {
  try {
    const data = (await import("@/mock-data/vehicle_summary.json")).default;
    return data as VehicleSummary[];
  } catch {
    console.error("[data] Failed to load vehicle_summary.json");
    return [];
  }
}
