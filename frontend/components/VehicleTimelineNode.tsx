"use client";

import { useState } from "react";
import { Car, Clock, Camera as CameraIcon, ShieldCheck } from "lucide-react";
import type { Sighting } from "@/lib/types";

interface VehicleTimelineNodeProps {
  sighting: Sighting;
  cameraName: string;
  index: number;
  isLast: boolean;
  isFirst: boolean;
}

function formatSeconds(totalSec: number): string {
  const mins = Math.floor(totalSec / 60);
  const secs = Math.floor(totalSec % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatDwell(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function VehicleTimelineNode({
  sighting,
  cameraName,
  index,
  isLast,
  isFirst,
}: VehicleTimelineNodeProps) {
  const [imageError, setImageError] = useState(!sighting.snapshot_url);

  return (
    <div
      className="relative flex gap-4 sm:gap-6 animate-node-in motion-reduce:animate-none"
      style={{ animationDelay: `${index * 120}ms` }}
    >
      {/* Vertical Track / Connector Line */}
      <div className="flex flex-col items-center">
        {/* Step Marker Node */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors z-10 ${
            isFirst
              ? "border-primary bg-primary text-primary-foreground shadow-sm"
              : "border-primary/60 bg-card text-primary"
          }`}
        >
          <span className="font-mono text-xs font-bold">{index + 1}</span>
        </div>

        {/* Connector Line (hidden on the last node) */}
        {!isLast && (
          <div className="w-0.5 grow bg-gradient-to-b from-primary/60 to-border my-1.5" />
        )}
      </div>

      {/* Sighting Card */}
      <div
        className={`flex-1 min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/40 ${
          isLast ? "mb-0" : "mb-6"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2 min-w-0">
            <CameraIcon className="h-4 w-4 text-primary shrink-0" />
            <h3 className="font-bold text-base sm:text-lg text-foreground tracking-tight truncate" title={cameraName}>
              {cameraName}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg">
              <Clock className="h-3 w-3" />
              {formatSeconds(sighting.first_seen_sec)}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-4 pt-3.5">
          {/* Sighting Snapshot Thumbnail with Fallback */}
          <div className="relative h-28 sm:h-20 w-full sm:w-32 shrink-0 overflow-hidden rounded-xl bg-slate-900 border border-border/50 flex items-center justify-center">
            {!imageError && sighting.snapshot_url ? (
              <img
                src={sighting.snapshot_url}
                alt={`Sighting at ${cameraName}`}
                onError={() => setImageError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                <Car className="h-6 w-6 text-slate-400 mb-0.5" />
                <span className="text-[10px] text-slate-500 font-medium">Snapshot unavailable</span>
              </div>
            )}
          </div>

          {/* Sighting Metrics */}
          <div className="flex-1 min-w-0 flex flex-col justify-between space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-muted/40 p-2 border border-border/30">
                <span className="text-muted-foreground block text-[11px]">Dwell Time</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatDwell(sighting.dwell_sec)}
                </span>
              </div>

              <div className="rounded-lg bg-muted/40 p-2 border border-border/30">
                <span className="text-muted-foreground block text-[11px]">Time Span</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatSeconds(sighting.first_seen_sec)} – {formatSeconds(sighting.last_seen_sec)}
                </span>
              </div>
            </div>

            {/* Recognition Quality / Confidence */}
            <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground pt-1">
              <span>
                Plate:{" "}
                <span className="font-medium text-foreground capitalize">
                  {sighting.plate_status.replace("_", " ")}
                </span>
              </span>

              {sighting.plate_confidence && (
                <span className="flex items-center gap-1 font-mono text-[11px] text-safe font-medium">
                  <ShieldCheck className="h-3 w-3" />
                  {Math.round(sighting.plate_confidence * 100)}% match
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
