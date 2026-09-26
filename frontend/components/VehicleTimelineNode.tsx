"use client";

import { useState } from "react";
import { Car, Clock, Camera as CameraIcon, ShieldCheck } from "lucide-react";
import type { Sighting } from "@/lib/types";
import { formatTimeOfDay } from "@/lib/timeUtils";

interface VehicleTimelineNodeProps {
  sighting: Sighting;
  cameraName: string;
  index: number;
  isLast: boolean;
  isFirst: boolean;
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

  const isUnreadable =
    sighting.plate_status === "unreadable" ||
    sighting.plate_status === "no_plate" ||
    !sighting.plate_text;

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
            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatTimeOfDay(sighting.first_seen_sec)}</span>
            </span>
          </div>
        </div>

        {/* Enlarged Snapshot Image (only rendered when an actual image is available and loaded) */}
        {!imageError && sighting.snapshot_url && (
          <div className="pt-3.5">
            <div className="relative h-44 sm:h-52 w-full overflow-hidden rounded-xl bg-slate-900 border border-border/50">
              <img
                src={sighting.snapshot_url}
                alt={`Sighting at ${cameraName}`}
                onError={() => setImageError(true)}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Simplified information row: Stayed duration + conditional unreadable badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Stayed:</span>
            <span className="font-mono font-bold text-foreground">
              {formatDwell(sighting.dwell_sec)}
            </span>
          </div>

          {/* Only mention "Plate unreadable" when the plate was not detected or unreadable */}
          {isUnreadable && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-verify/10 border border-verify/25 px-2.5 py-0.5 text-xs font-semibold text-verify">
              Plate unreadable
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
