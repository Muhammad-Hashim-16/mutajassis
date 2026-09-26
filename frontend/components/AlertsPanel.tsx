"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  Check,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  MapPin,
  Calendar,
} from "lucide-react";
import type { VehicleSummary, Sighting, Camera } from "@/lib/types";
import { formatTimeOfDay, formatDuration } from "@/lib/timeUtils";

interface AlertsPanelProps {
  alerts: VehicleSummary[];
  onUpdateStatus: (vehicleKey: string, newStatus: "none" | "unresolved_alert") => void;
  sightings: Sighting[];
  cameras: Camera[];
}

function isPlateLike(key?: string | null): boolean {
  if (!key) return false;
  return /^[A-Z]{2,4}-\d{3,4}$/i.test(key.trim()) || key.includes("-");
}

interface AlertCardProps {
  item: VehicleSummary;
  onUpdateStatus: (vehicleKey: string, newStatus: "none" | "unresolved_alert") => void;
  sightings: Sighting[];
  cameras: Camera[];
}

function AlertCard({ item, onUpdateStatus, sightings, cameras }: AlertCardProps) {
  // Demo countdown: 15 seconds
  const [timeLeft, setTimeLeft] = useState(15);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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

  // When timer reaches 0, trigger status update
  useEffect(() => {
    if (isPending && timeLeft === 0) {
      onUpdateStatus(item.vehicle_key, "unresolved_alert");
    }
  }, [isPending, timeLeft, item.vehicle_key, onUpdateStatus]);

  const handleRecognize = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    if (timerRef.current) clearInterval(timerRef.current);

    setIsDismissing(true);
    setTimeout(() => {
      onUpdateStatus(item.vehicle_key, "none");
    }, 300);
  };

  const handleUnrecognized = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    if (timerRef.current) clearInterval(timerRef.current);

    onUpdateStatus(item.vehicle_key, "unresolved_alert");
  };

  // Resolve chronologically ordered sightings for this vehicle
  const orderedSightings = useMemo(() => {
    if (!item.sighting_ids || item.sighting_ids.length === 0) return [];
    const sightingMap = new Map<string, Sighting>(sightings.map((s) => [s.id, s]));
    const matched: Sighting[] = [];
    for (const sId of item.sighting_ids) {
      const s = sightingMap.get(sId);
      if (s) matched.push(s);
    }
    return matched.sort((a, b) => a.first_seen_sec - b.first_seen_sec);
  }, [item.sighting_ids, sightings]);

  const cameraMap = useMemo(() => {
    return new Map<string, string>(cameras.map((c) => [c.id, c.name]));
  }, [cameras]);

  // Most recent camera name
  const mostRecentCameraName = useMemo(() => {
    if (orderedSightings.length === 0) return "Colony Area";
    const lastSighting = orderedSightings[orderedSightings.length - 1];
    return cameraMap.get(lastSighting.camera_id) || "Colony Camera";
  }, [orderedSightings, cameraMap]);

  // First seen and last seen times
  const firstSeenTime = orderedSightings.length > 0
    ? formatTimeOfDay(orderedSightings[0].first_seen_sec)
    : "10:00 a.m.";
  const lastSeenTime = orderedSightings.length > 0
    ? formatTimeOfDay(orderedSightings[orderedSightings.length - 1].last_seen_sec)
    : "10:15 a.m.";

  const isPlate = isPlateLike(item.vehicle_key);
  const displayPlate = isPlate ? item.vehicle_key : "Unregistered Vehicle";

  // Progress percentage for countdown
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / 15) * 100));

  // Stay progress bar calculation (dwell up to 15 mins for visual bar)
  const stayMinutes = Math.max(1, Math.round((item.cumulative_dwell_sec || 60) / 60));
  const stayPercent = Math.min(100, Math.max(15, (stayMinutes / 15) * 100));

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 bg-card shadow-sm ${
        isUnresolved ? "border-alert/30 bg-alert/[0.015]" : "border-border hover:border-verify/40"
      } ${
        isDismissing
          ? "opacity-0 -translate-y-2 scale-98 transition-all duration-300 ease-in-out motion-reduce:opacity-0"
          : "opacity-100 translate-y-0"
      }`}
    >
      {/* ─────────────────────────────────────────────────────────────
          DEFAULT / COLLAPSED CARD VIEW
          Shows strictly:
          1. Status (green, yellow, or red)
          2. Number plate
          3. Most recent location ("Seen at [Camera]")
          4. Flag actions & timer (by default)
          5. Expand icon button
         ───────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left section: Status + Plate + Most Recent Location */}
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            {/* Status indicator (Yellow for Pending, Red for Unresolved) */}
            <div className="shrink-0 mt-0.5 sm:mt-0">
              {isPending && (
                <span
                  title="Needs Verification"
                  className="relative flex h-3.5 w-3.5 items-center justify-center"
                >
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-verify opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-verify shadow-xs" />
                </span>
              )}
              {isUnresolved && (
                <span
                  title="Unresolved Alert"
                  className="relative flex h-3.5 w-3.5 items-center justify-center"
                >
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-alert shadow-xs" />
                </span>
              )}
            </div>

            {/* Plate & Most Recent Location */}
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-lg sm:text-xl font-extrabold tracking-tight text-foreground truncate">
                  {displayPlate}
                </span>

                {/* Status Badge */}
                {isPending && (
                  <span className="inline-flex items-center rounded-full bg-verify/10 border border-verify/25 px-2.5 py-0.5 text-xs font-semibold text-verify">
                    Needs Verification
                  </span>
                )}
                {isUnresolved && (
                  <span className="inline-flex items-center rounded-full bg-alert/10 border border-alert/25 px-2.5 py-0.5 text-xs font-semibold text-alert">
                    Unresolved Alert
                  </span>
                )}
              </div>

              {/* Only show most recent location by default */}
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>
                  Seen at <strong className="text-foreground font-semibold">{mostRecentCameraName}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right section: Timer + Flag Buttons (by default) + Expand Icon */}
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-border/50">
            {/* Interactive Flag Actions & Timer for Pending Verification */}
            {isPending && (
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Countdown Timer */}
                <div
                  className="flex items-center gap-1.5 rounded-lg bg-verify/10 border border-verify/20 px-2.5 py-1 text-xs font-mono font-bold text-verify"
                  title="Verification response timer"
                >
                  <Clock className="h-3.5 w-3.5 animate-pulse" />
                  <span>{timeLeft}s</span>
                </div>

                {/* Flag Green: "I Recognize This" */}
                <button
                  type="button"
                  onClick={handleRecognize}
                  disabled={isProcessing}
                  title="Recognize vehicle as known neighbor/visitor"
                  className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-safe hover:bg-safe/90 text-white font-semibold px-3 py-1.5 text-xs shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-safe disabled:opacity-50 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5 shrink-0" />
                  <span>Recognize</span>
                </button>

                {/* Flag Red: "Unknown" */}
                <button
                  type="button"
                  onClick={handleUnrecognized}
                  disabled={isProcessing}
                  title="Flag as unrecognized vehicle"
                  className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground font-semibold px-3 py-1.5 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-muted disabled:opacity-50 cursor-pointer"
                >
                  <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Unknown</span>
                </button>
              </div>
            )}

            {/* Expand / Collapse Icon Button */}
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              aria-expanded={isExpanded}
              title={isExpanded ? "Collapse alert details" : "Expand alert details"}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs ml-auto md:ml-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Shrinking timer progress bar for pending verification */}
        {isPending && (
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted/60">
            <div
              className="h-full bg-verify transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          EXPANDED CARD VIEW
          Shown after clicking the expand icon:
          1. Numberplate & Registration Status
          2. Seen at (sequence of stay in order with proper arrows)
          3. Estimated time in neighborhood (simple aesthetic bar)
          4. Text: "Flagged for resident verification. Logged in colony timeline."
         ───────────────────────────────────────────────────────────── */}
      {isExpanded && (
        <div className="border-t border-border/60 bg-muted/20 p-4 sm:p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">

          {/* 2. Numberplate */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Numberplate
            </span>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-lg font-bold text-foreground bg-card border border-border px-3 py-1 rounded-xl shadow-2xs">
                {displayPlate}
              </span>
              <span className="text-xs text-muted-foreground">
                {item.registered ? "Registered Resident Vehicle" : "Not listed in colony catalogue"}
              </span>
            </div>
          </div>

          {/* 3. Seen at (sequence of stay in order with proper arrows) */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Seen At (Movement Sequence)
            </span>
            {orderedSightings.length === 0 ? (
              <p className="text-xs text-muted-foreground">Location not recorded.</p>
            ) : (
              <div className="flex items-center flex-wrap gap-2 pt-0.5">
                {orderedSightings.map((sighting, idx) => {
                  const camName = cameraMap.get(sighting.camera_id) || `Camera ${idx + 1}`;
                  const timeStr = formatTimeOfDay(sighting.first_seen_sec);
                  const isLastStep = idx === orderedSightings.length - 1;

                  return (
                    <div key={sighting.id} className="flex items-center gap-2">
                      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-xs shadow-2xs">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary font-mono font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-foreground">{camName}</span>
                        <span className="font-mono text-muted-foreground text-[11px]">
                          ({timeStr})
                        </span>
                      </div>

                      {!isLastStep && (
                        <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 animate-pulse" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Estimated time in neighborhood (simple aesthetic bar) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                Estimated Time in Neighborhood
              </span>
              <span className="font-mono font-bold text-foreground">
                {formatDuration(item.cumulative_dwell_sec)}
              </span>
            </div>

            {/* Clean, aesthetic stay progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/80 border border-border/40">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary via-verify to-alert transition-all duration-500"
                style={{ width: `${stayPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>First: {firstSeenTime}</span>
              <span>Last: {lastSeenTime}</span>
            </div>
          </div>

          {/* 5. Required Notification Notice */}
          <div className="flex items-center gap-2 rounded-xl bg-card border border-border p-3 text-xs text-muted-foreground shadow-2xs">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <span className="font-medium text-foreground">
              Flagged for resident verification. Logged in colony timeline.
            </span>
          </div>
        </div>
      )}
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
        <div className="space-y-3.5">
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
