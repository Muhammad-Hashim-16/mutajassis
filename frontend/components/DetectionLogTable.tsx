"use client";

import { Clock, ShieldCheck, Car, AlertCircle } from "lucide-react";
import { formatTimeOfDay } from "@/lib/timeUtils";

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
            <h3 className="text-base font-semibold text-foreground">No vehicle sightings yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Vehicles detected across active camera streams will appear here chronologically.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm border-collapse min-w-[520px]">
            <thead className="sticky top-0 z-10 border-b border-border bg-muted/95 backdrop-blur-sm text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="py-3 px-5 min-w-[120px]">
                  Time Seen
                </th>
                <th scope="col" className="py-3 px-5 min-w-[180px]">
                  Camera Location
                </th>
                <th scope="col" className="py-3 px-5 min-w-[150px]">
                  Vehicle Plate
                </th>
                <th scope="col" className="py-3 px-5 text-right min-w-[150px]">
                  Colony Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {detections.map((item) => {
                const formattedTime = formatTimeOfDay(item.firstSeenSec);
                const isTemp = item.statusType === "unidentified" || item.displayId.startsWith("TMP-");
                const plateText = isTemp ? "No Plate Detected" : item.displayId;

                return (
                  <tr
                    key={item.key}
                    className="transition-colors hover:bg-muted/40 animate-row-in motion-reduce:animate-none"
                  >
                    {/* Time Seen (using a.m. / p.m.) */}
                    <td className="py-3.5 px-5 align-middle">
                      <span className="font-mono text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg">
                        {formattedTime}
                      </span>
                    </td>

                    {/* Camera Location */}
                    <td className="py-3.5 px-5 align-middle font-medium text-foreground">
                      <span className="truncate block max-w-[220px]" title={item.cameraName}>
                        {item.cameraName}
                      </span>
                    </td>

                    {/* Vehicle Plate */}
                    <td className="py-3.5 px-5 align-middle">
                      {isTemp ? (
                        <span className="text-xs text-muted-foreground italic font-medium">
                          No Plate Detected
                        </span>
                      ) : (
                        <span className="font-mono text-sm font-bold tracking-wider text-foreground">
                          {plateText}
                        </span>
                      )}
                    </td>

                    {/* Colony Status Badge */}
                    <td className="py-3.5 px-5 align-middle text-right">
                      {item.statusType === "known" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-safe/10 border border-safe/25 px-2.5 py-0.5 text-xs font-semibold text-safe">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Resident
                        </span>
                      )}
                      {item.statusType === "unknown" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-verify/10 border border-verify/25 px-2.5 py-0.5 text-xs font-semibold text-verify">
                          <span className="h-1.5 w-1.5 rounded-full bg-verify" />
                          Unregistered Visitor
                        </span>
                      )}
                      {item.statusType === "unidentified" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          Unidentified
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
