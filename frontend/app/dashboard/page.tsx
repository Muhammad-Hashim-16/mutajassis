"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { getCameras, getRegisteredVehicles, getSightings, getVehicleSummary } from "@/lib/data";
import type { Camera, RegisteredVehicle, Sighting, VehicleSummary } from "@/lib/types";
import CameraFeedCard from "@/components/CameraFeedCard";
import DetectionLogTable, { DetectionRow } from "@/components/DetectionLogTable";
import AlertsPanel from "@/components/AlertsPanel";
import { FadeIn } from "@/components/FadeIn";
import { CameraOff } from "lucide-react";

function deriveDetectionStatus(
  sighting: Sighting,
  registeredPlates: Set<string>
): {
  displayId: string;
  statusLabel: string;
  statusType: "known" | "unknown" | "unidentified";
} {
  // If plate_status is unreadable, no_plate, or plate_text is missing/null
  if (
    sighting.plate_status === "unreadable" ||
    sighting.plate_status === "no_plate" ||
    !sighting.plate_text ||
    sighting.plate_text.trim() === ""
  ) {
    return {
      displayId: "No Plate Detected",
      statusLabel: "Unidentified",
      statusType: "unidentified",
    };
  }

  // Plate is readable and plate_text exists
  const normalizedPlate = sighting.plate_text.trim().toUpperCase();
  const isRegistered = registeredPlates.has(normalizedPlate);

  if (isRegistered) {
    return {
      displayId: sighting.plate_text,
      statusLabel: "Resident",
      statusType: "known",
    };
  } else {
    return {
      displayId: sighting.plate_text,
      statusLabel: "Unregistered Visitor",
      statusType: "unknown",
    };
  }
}

export default function DashboardPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [registeredVehicles, setRegisteredVehicles] = useState<RegisteredVehicle[]>([]);
  const [vehicleSummaries, setVehicleSummaries] = useState<VehicleSummary[]>([]);
  const [detections, setDetections] = useState<DetectionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // References for high-frequency video playback tracking
  const cameraPlaybackRef = useRef<Record<string, { lastTime: number; loopCount: number }>>({});
  const revealedKeySetRef = useRef<Set<string>>(new Set());
  const camerasRef = useRef<Camera[]>([]);
  const sightingsRef = useRef<Sighting[]>([]);
  const registeredPlatesSetRef = useRef<Set<string>>(new Set());

  // Keep refs in sync with state
  camerasRef.current = cameras;
  sightingsRef.current = sightings;
  registeredPlatesSetRef.current = new Set(
    registeredVehicles
      .map((v) => (v.plate_text ? v.plate_text.trim().toUpperCase() : null))
      .filter((plate): plate is string => Boolean(plate))
  );

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [cams, regs, sights, summaries] = await Promise.all([
          getCameras(),
          getRegisteredVehicles(),
          getSightings(),
          getVehicleSummary(),
        ]);
        if (isMounted) {
          setCameras(cams || []);
          setRegisteredVehicles(regs || []);
          setSightings(sights || []);
          setVehicleSummaries(summaries || []);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to load dashboard data in page.tsx:", err);
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle local interactive verification for the hackathon demo session.
  // TODO: Persist verification status to Supabase once backend is connected. Currently local React state for hackathon demo.
  const handleUpdateAlertStatus = useCallback(
    (vehicleKey: string, newStatus: "none" | "unresolved_alert") => {
      setVehicleSummaries((prev) =>
        prev.map((item) =>
          item.vehicle_key === vehicleKey ? { ...item, alert_status: newStatus } : item
        )
      );
    },
    []
  );

  // Handle high-frequency onTimeUpdate from each camera's video element
  const handleTimeUpdate = useCallback((cameraId: string, currentTime: number) => {
    // 1. Get or initialize camera playback tracking state
    const playback = cameraPlaybackRef.current[cameraId] || {
      lastTime: 0,
      loopCount: 0,
    };

    let loopCount = playback.loopCount;
    // Video has looped back to the start if currentTime drops significantly below last recorded time
    if (currentTime < playback.lastTime - 1.5 && playback.lastTime > 2) {
      loopCount += 1;
    }

    cameraPlaybackRef.current[cameraId] = {
      lastTime: currentTime,
      loopCount,
    };

    // 2. Identify camera (skip if not found)
    const camera = camerasRef.current.find((c) => c.id === cameraId);
    if (!camera) return;

    // 3. Find sightings for this camera that have first_seen_sec <= current playback time
    const eligibleSightings = sightingsRef.current.filter(
      (s) => s.camera_id === cameraId && s.first_seen_sec <= currentTime
    );

    const newlyRevealed: DetectionRow[] = [];
    const registeredSet = registeredPlatesSetRef.current;

    for (const sighting of eligibleSightings) {
      const key = `${sighting.id}-${loopCount}`;
      if (!revealedKeySetRef.current.has(key)) {
        revealedKeySetRef.current.add(key);

        const status = deriveDetectionStatus(sighting, registeredSet);
        newlyRevealed.push({
          key,
          sightingId: sighting.id,
          cameraId: sighting.camera_id,
          cameraName: camera.name,
          loopCount,
          snapshotUrl: sighting.snapshot_url,
          displayId: status.displayId,
          statusLabel: status.statusLabel,
          statusType: status.statusType,
          firstSeenSec: sighting.first_seen_sec,
        });
      }
    }

    if (newlyRevealed.length > 0) {
      // Sort newest sightings to the top
      newlyRevealed.sort((a, b) => b.firstSeenSec - a.firstSeenSec);
      setDetections((prev) => [...newlyRevealed, ...prev]);
    }
  }, []);

  // User requirement: 2 camera feeds for enhanced clarity and larger viewport
  const activeCameras = cameras.slice(0, 2);
  const cameraCount = activeCameras.length;
  const subtitle = "Monitoring 2 optical CCTV feeds across the colony in real time.";

  return (
    <div className="space-y-12 pb-16">
      {/* Page Header */}
      <FadeIn>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Colony CCTV Grid
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Live Neighborhood Feed
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            {!isLoading && cameraCount > 0
              ? subtitle
              : "Real-time automated surveillance stream."}
          </p>
        </div>
      </FadeIn>

      {/* Active Alerts Panel — Positioned directly below the header, above camera grid */}
      {!isLoading && (
        <FadeIn delay={75}>
          <AlertsPanel
            alerts={vehicleSummaries}
            onUpdateStatus={handleUpdateAlertStatus}
            sightings={sightings}
            cameras={cameras}
          />
        </FadeIn>
      )}

      {/* Camera Grid Section (Converted to 2-box feed) */}
      {!isLoading && cameraCount > 0 ? (
        <FadeIn delay={150}>
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Monitored Cameras
              </h2>
              <p className="text-sm text-muted-foreground sm:text-base">
                Real-time optical feeds from participating residential colony cameras.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {activeCameras.map((camera) => (
                <CameraFeedCard
                  key={camera.id}
                  camera={camera}
                  onTimeUpdate={handleTimeUpdate}
                />
              ))}
            </div>
          </div>
        </FadeIn>
      ) : !isLoading && cameraCount === 0 ? (
        <FadeIn delay={150}>
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center shadow-sm">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <CameraOff className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              No camera feeds configured yet
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Connected colony CCTV streams and entrance cameras will appear here once registered.
            </p>
          </div>
        </FadeIn>
      ) : null}

      {/* Live Detection Log Section */}
      <FadeIn delay={225}>
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Live Detection Log
            </h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              Vehicles identified across all monitored entry points.
            </p>
          </div>

          <DetectionLogTable detections={detections} />
        </div>
      </FadeIn>
    </div>
  );
}
