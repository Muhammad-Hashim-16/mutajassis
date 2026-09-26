"use client";

import { ShieldCheck, AlertTriangle, Clock, CheckCircle2, Car, MapPin } from "lucide-react";
import type { VehicleSummary, RegisteredVehicle } from "@/lib/types";

interface VehicleSummaryCardProps {
  summary: VehicleSummary;
  registeredVehicles: RegisteredVehicle[];
  cameraCount: number;
  totalSightings: number;
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
  return /^[A-Z]{2,4}-\d{3,4}$/i.test(key.trim()) || key.includes("-");
}

export default function VehicleSummaryCard({
  summary,
  registeredVehicles,
  cameraCount,
  totalSightings,
}: VehicleSummaryCardProps) {
  const isPlate = isPlateLike(summary.vehicle_key);
  const displayId = summary.vehicle_key || "Unknown Vehicle ID";

  // Look up owner label if registered
  const registeredInfo = registeredVehicles.find(
    (r) => r.plate_text.trim().toUpperCase() === summary.vehicle_key.trim().toUpperCase()
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
      {/* Header with ID and badges */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            {isPlate ? "License Plate" : "Temporary ID"}
          </span>

          {/* Registration Badge */}
          {summary.registered ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-safe/10 border border-safe/25 px-2.5 py-0.5 text-xs font-semibold text-safe">
              <ShieldCheck className="h-3.5 w-3.5" />
              Registered Resident Vehicle
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-verify/10 border border-verify/25 px-2.5 py-0.5 text-xs font-semibold text-verify">
              <span className="h-1.5 w-1.5 rounded-full bg-verify" />
              Not in Registered List
            </span>
          )}
        </div>

        <h2 className="font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {displayId}
        </h2>

        {registeredInfo?.owner_label && (
          <p className="text-xs sm:text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Resident:</span> {registeredInfo.owner_label}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/60">
        {/* Total Dwell */}
        <div className="rounded-xl bg-muted/40 p-3 border border-border/40">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Clock className="h-3.5 w-3.5" />
            <span>Total Presence</span>
          </div>
          <p className="font-mono text-base font-bold text-foreground">
            {formatDwellTime(summary.cumulative_dwell_sec)}
          </p>
        </div>

        {/* Camera Breadth */}
        <div className="rounded-xl bg-muted/40 p-3 border border-border/40">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <MapPin className="h-3.5 w-3.5" />
            <span>Locations</span>
          </div>
          <p className="text-base font-bold text-foreground">
            {cameraCount} {cameraCount === 1 ? "camera" : "cameras"}
          </p>
        </div>
      </div>

      {/* Alert Status Info */}
      <div className="pt-2 border-t border-border/60 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">Awareness Status</span>
          {summary.alert_status === "unresolved_alert" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-alert/10 border border-alert/25 px-2.5 py-0.5 font-semibold text-alert">
              <AlertTriangle className="h-3.5 w-3.5" />
              Unresolved Alert
            </span>
          )}
          {summary.alert_status === "pending_verification" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-verify/10 border border-verify/25 px-2.5 py-0.5 font-semibold text-verify">
              <span className="h-1.5 w-1.5 rounded-full bg-verify animate-pulse" />
              Pending Verification
            </span>
          )}
          {summary.alert_status === "none" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-safe/10 border border-safe/25 px-2.5 py-0.5 font-semibold text-safe">
              <CheckCircle2 className="h-3.5 w-3.5" />
              No concerns
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {summary.alert_status === "unresolved_alert"
            ? "Unrecognized vehicle with high dwell time. Logged for resident awareness."
            : summary.alert_status === "pending_verification"
            ? "Unrecognized vehicle currently under community awareness verification."
            : summary.registered
            ? "Known colony vehicle operating within normal routine."
            : "Short-term visitor with no awareness triggers."}
        </p>
      </div>
    </div>
  );
}
