"use client";

import { useState, useEffect, useRef } from "react";
import { ShieldCheck, AlertTriangle, Clock, Car, Check, HelpCircle } from "lucide-react";
import type { VehicleSummary, Sighting, Camera } from "@/lib/types";

interface AlertsPanelProps {
  alerts: VehicleSummary[];
  onUpdateStatus: (vehicleKey: string, newStatus: "none" | "unresolved_alert") => void;
  sightings: Sighting[];
  cameras: Camera[];
}

function formatDwellTime(seconds?: number | null): string {
  if (seconds === undefined || seconds === null || seconds <= 0) {
    return "0s";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

function isPlateLike(key?: string | null): boolean {
  if (!key) return false;
  // Common Pakistani plate formats contain hyphen, e.g. LEA-4521, MUL-9931
  return /^[A-Z]{2,4}-\d{3,4}$/i.test(key.trim()) || key.includes("-");
}

function resolveCameraLocations(
  sightingIds: string[] | undefined,
  sightings: Sighting[],
  cameras: Camera[]
): string {
  if (!sightingIds || sightingIds.length === 0) return "Unknown location";

  const cameraNames = new Set<string>();
  const sightingMap = new Map<string, Sighting>(sightings.map((s) => [s.id, s]));
  const cameraMap = new Map<string, Camera>(cameras.map((c) => [c.id, c]));

  for (const sId of sightingIds) {
    const sighting = sightingMap.get(sId);
    if (sighting) {
      const camera = cameraMap.get(sighting.camera_id);
      if (camera?.name) {
        cameraNames.add(camera.name);
      }
    }
  }

  if (cameraNames.size === 0) return "Unknown location";
  return Array.from(cameraNames).join(", ");
}

interface AlertCardProps {
  item: VehicleSummary;
  onUpdateStatus: (vehicleKey: string, newStatus: "none" | "unresolved_alert") => void;
  sightings: Sighting[];
  cameras: Camera[];
}

function AlertCard({ item, onUpdateStatus, sightings, cameras }: AlertCardProps) {
  // Demo countdown: 15 seconds (shortened from colony default 10-15 minutes for live demo pacing)
  const [timeLeft, setTimeLeft] = useState(15);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [imageError, setImageError] = useState(!item.alert_snapshot_url);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isPending = item.alert_status === "pending_verification";
  const isUnresolved = item.alert_status === "unresolved_alert";

  // Countdown timer for pending verification alerts
  useEffect(() => {
    if (!isPending) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPending]);

  // When timer reaches 0, trigger status update in an effect (not during another component's state update)
  useEffect(() => {
    if (isPending && timeLeft === 0) {
      onUpdateStatus(item.vehicle_key, "unresolved_alert");
    }
  }, [isPending, timeLeft, item.vehicle_key, onUpdateStatus]);

  const handleRecognize = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    if (timerRef.current) clearInterval(timerRef.current);

    // Trigger exit animation before removing from active alerts
    setIsDismissing(true);
    setTimeout(() => {
      // TODO: Persist recognized verification status to Supabase once backend is connected.
      onUpdateStatus(item.vehicle_key, "none");
    }, 300);
  };

  const handleUnrecognized = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    if (timerRef.current) clearInterval(timerRef.current);

    // TODO: Persist unresolved escalation to Supabase once backend is connected.
    onUpdateStatus(item.vehicle_key, "unresolved_alert");
  };

  const cameraLocations = resolveCameraLocations(item.sighting_ids, sightings, cameras);
  const identifierLabel = isPlateLike(item.vehicle_key) ? "Plate" : "Temporary ID";
  const displayId = item.vehicle_key || "Unknown Vehicle ID";

  const progressPercent = Math.max(0, Math.min(100, (timeLeft / 15) * 100));

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 bg-card shadow-sm ${
        isUnresolved ? "border-alert/30 bg-alert/[0.02]" : "border-border hover:border-verify/40"
      } ${
        isDismissing
          ? "opacity-0 -translate-y-2 scale-98 transition-all duration-300 ease-in-out motion-reduce:opacity-0"
          : "opacity-100 translate-y-0"
      }`}
    >
      <div className="flex flex-col md:flex-row items-stretch gap-4 sm:gap-5 p-4 sm:p-5">
        {/* Snapshot Thumbnail / Fallback */}
        <div className="relative h-36 sm:h-32 md:h-auto md:w-44 w-full overflow-hidden rounded-xl bg-slate-900 border border-border/50 shrink-0 flex items-center justify-center">
          {!imageError && item.alert_snapshot_url ? (
            <img
              src={item.alert_snapshot_url}
              alt={`Snapshot for ${displayId}`}
              onError={() => setImageError(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
              <Car className="h-8 w-8 text-slate-400 mb-1" />
              <span className="text-[11px] text-slate-500 font-medium">Snapshot unavailable</span>
            </div>
          )}
        </div>

        {/* Content Details */}
        <div className="flex flex-1 flex-col justify-between space-y-4">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              {/* Status Badge */}
              {isPending && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-verify/10 border border-verify/25 px-2.5 py-0.5 text-xs font-semibold text-verify">
                  <span className="h-1.5 w-1.5 rounded-full bg-verify animate-pulse" />
                  Pending Verification
                </span>
              )}
              {isUnresolved && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-alert/10 border border-alert/25 px-2.5 py-0.5 text-xs font-semibold text-alert">
                  <span className="h-1.5 w-1.5 rounded-full bg-alert" />
                  Unresolved Alert
                </span>
              )}

              {/* Countdown badge for pending */}
              {isPending && (
                <span className="inline-flex items-center gap-1 text-xs font-mono font-medium text-verify">
                  <Clock className="h-3.5 w-3.5" />
                  {timeLeft}s remaining
                </span>
              )}
            </div>

            {/* Vehicle ID & Locations */}
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-foreground flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  {identifierLabel}:
                </span>
                <span className="font-mono text-lg sm:text-xl tracking-tight text-foreground break-all">
                  {displayId}
                </span>
              </h3>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Seen at:</span> {cameraLocations}
              </p>

              <p className="text-xs sm:text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Time in neighborhood:</span>{" "}
                <span className="font-mono">{formatDwellTime(item.cumulative_dwell_sec)}</span>
              </p>
            </div>

            {/* Neutral Contextual Copy */}
            <p className="mt-2.5 text-xs text-muted-foreground/90 leading-relaxed">
              {isPending
                ? "This vehicle hasn't been recognized yet by residents. Please verify if you recognize it."
                : "This vehicle was not recognized by any resident. Flagged for neighborhood awareness."}
            </p>
          </div>

          {/* Interactive Flow for Pending Alert */}
          {isPending && (
            <div className="space-y-3 pt-1 border-t border-border/60">
              {/* Shrinking progress bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-verify transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Action Buttons: Stack vertically on mobile, row on tablet/desktop, min-44px tap height */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleRecognize}
                  disabled={isProcessing}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-safe hover:bg-safe/90 text-white font-semibold px-4 py-2.5 text-xs sm:text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-safe focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 cursor-pointer"
                >
                  <Check className="h-4 w-4 shrink-0" />
                  <span>I Recognize This Vehicle</span>
                </button>

                <button
                  type="button"
                  onClick={handleUnrecognized}
                  disabled={isProcessing}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground font-semibold px-4 py-2.5 text-xs sm:text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-muted focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 cursor-pointer"
                >
                  <HelpCircle className="h-4 w-4 shrink-0" />
                  <span>I Don't Recognize This</span>
                </button>
              </div>
            </div>
          )}

          {/* Informational Notice for Unresolved Alert */}
          {isUnresolved && (
            <div className="flex items-center gap-2 rounded-xl bg-alert/5 border border-alert/15 px-3 py-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-alert shrink-0" />
              <span>Flagged for resident verification. Logged in colony timeline.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AlertsPanel({ alerts, onUpdateStatus, sightings, cameras }: AlertsPanelProps) {
  // Filter for active alerts: pending_verification or unresolved_alert
  const activeAlerts = alerts.filter(
    (a) => a.alert_status === "pending_verification" || a.alert_status === "unresolved_alert"
  );

  // Sort so unresolved_alert entries appear first, then pending_verification
  const sortedAlerts = [...activeAlerts].sort((a, b) => {
    if (a.alert_status === "unresolved_alert" && b.alert_status === "pending_verification") return -1;
    if (a.alert_status === "pending_verification" && b.alert_status === "unresolved_alert") return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Active Alerts
          </h2>
          {activeAlerts.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-verify/15 px-2.5 py-0.5 text-xs font-bold text-verify">
              {activeAlerts.length}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground sm:text-base">
          Vehicles that stayed in the neighborhood without being recognized by a resident.
        </p>
      </div>

      {/* Alerts Content or Calm Positive Empty State */}
      {sortedAlerts.length === 0 ? (
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-safe/10 text-safe shrink-0 border border-safe/20">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">No active alerts — all clear.</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              All monitored vehicles in the colony are recognized residents or short-term visitors.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedAlerts.map((item) => (
            <AlertCard
              key={item.vehicle_key}
              item={item}
              onUpdateStatus={onUpdateStatus}
              sightings={sightings}
              cameras={cameras}
            />
          ))}
        </div>
      )}
    </div>
  );
}
