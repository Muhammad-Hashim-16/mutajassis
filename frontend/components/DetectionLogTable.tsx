"use client";

import { useState } from "react";
import { Car, Clock } from "lucide-react";

export interface DetectionRow {
  key: string;
  sightingId: string;
  cameraId: string;
  cameraName: string;
  loopCount: number;
  snapshotUrl: string;
  displayId: string;
  statusLabel: string;
  statusType: "known" | "unknown" | "unidentified";
  firstSeenSec: number;
}

interface DetectionLogTableProps {
  detections: DetectionRow[];
}

function SnapshotThumbnail({ src, alt }: { src: string; alt: string }) {
  const [hasError, setHasError] = useState(!src);

  if (hasError || !src) {
    return (
      <div className="flex h-10 w-14 items-center justify-center rounded-lg bg-muted text-muted-foreground border border-border/50 shrink-0">
        <Car className="h-5 w-5" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="relative h-10 w-14 overflow-hidden rounded-lg border border-border/50 bg-slate-900 shrink-0">
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function formatSeconds(totalSec: number): string {
  const mins = Math.floor(totalSec / 60);
  const secs = Math.floor(totalSec % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function DetectionLogTable({ detections }: DetectionLogTableProps) {
  return (
    <div className="w-full max-w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <style>{`
        @keyframes rowSlideIn {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-row-in {
          animation: rowSlideIn 0.35s ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-row-in {
            animation: none !important;
          }
        }
      `}</style>
      <div className="w-full max-h-[460px] overflow-y-auto overflow-x-auto">
        {detections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Clock className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No detections yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Vehicles detected across active camera streams will be logged here automatically.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm border-collapse min-w-[540px]">
            <thead className="sticky top-0 z-10 border-b border-border bg-muted/95 backdrop-blur-sm text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="py-3 px-4 w-20">
                  Snapshot
                </th>
                <th scope="col" className="py-3 px-4 min-w-[160px]">
                  Camera
                </th>
                <th scope="col" className="py-3 px-4 min-w-[140px]">
                  Plate / Temp ID
                </th>
                <th scope="col" className="py-3 px-4 min-w-[160px]">
                  Status
                </th>
                <th scope="col" className="py-3 px-4 text-right min-w-[100px]">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {detections.map((item) => (
                <tr
                  key={item.key}
                  className="transition-colors hover:bg-muted/40 animate-row-in motion-reduce:animate-none"
                >
                  {/* Thumbnail */}
                  <td className="py-3 px-4 align-middle">
                    <SnapshotThumbnail
                      src={item.snapshotUrl}
                      alt={`Snapshot for ${item.displayId}`}
                    />
                  </td>

                  {/* Camera Name */}
                  <td className="py-3 px-4 align-middle font-medium text-foreground">
                    <span className="truncate block max-w-[200px]" title={item.cameraName}>
                      {item.cameraName}
                    </span>
                  </td>

                  {/* Plate / Temp ID */}
                  <td className="py-3 px-4 align-middle">
                    <span className="font-mono text-sm font-semibold tracking-wider text-foreground">
                      {item.displayId}
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-4 align-middle">
                    {item.statusType === "known" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-safe/10 border border-safe/25 px-2.5 py-0.5 text-xs font-medium text-safe">
                        <span className="h-1.5 w-1.5 rounded-full bg-safe" />
                        {item.statusLabel}
                      </span>
                    )}
                    {item.statusType === "unknown" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-verify/10 border border-verify/25 px-2.5 py-0.5 text-xs font-medium text-verify">
                        <span className="h-1.5 w-1.5 rounded-full bg-verify" />
                        {item.statusLabel}
                      </span>
                    )}
                    {item.statusType === "unidentified" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                        {item.statusLabel}
                      </span>
                    )}
                  </td>

                  {/* Timestamp */}
                  <td className="py-3 px-4 align-middle text-right font-mono text-xs text-muted-foreground">
                    {formatSeconds(item.firstSeenSec)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
