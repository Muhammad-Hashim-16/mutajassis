"use client";

import { ShieldCheck, Car } from "lucide-react";
import type { RegisteredVehicle } from "@/lib/types";

interface RegisteredVehiclesTableProps {
  vehicles: RegisteredVehicle[];
}

export default function RegisteredVehiclesTable({ vehicles }: RegisteredVehiclesTableProps) {
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

      <div className="w-full overflow-x-auto">
        {vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Car className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No vehicles registered yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add known resident vehicles using the form above to exempt them from awareness alerts.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm border-collapse min-w-[460px]">
            <thead className="border-b border-border bg-muted/95 backdrop-blur-sm text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="py-3 px-5 min-w-[140px]">
                  Plate Number
                </th>
                <th scope="col" className="py-3 px-5 min-w-[200px]">
                  Owner / Resident Label
                </th>
                <th scope="col" className="py-3 px-5 text-right min-w-[120px]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {vehicles.map((v) => (
                <tr
                  key={v.plate_text}
                  className="transition-colors hover:bg-muted/40 animate-row-in motion-reduce:animate-none"
                >
                  {/* Plate Number */}
                  <td className="py-3.5 px-5 align-middle">
                    <span className="font-mono text-base font-bold tracking-wider text-foreground">
                      {v.plate_text}
                    </span>
                  </td>

                  {/* Owner Label */}
                  <td className="py-3.5 px-5 align-middle font-medium text-foreground">
                    <span className="truncate block max-w-xs sm:max-w-md" title={v.owner_label}>
                      {v.owner_label}
                    </span>
                  </td>

                  {/* Registration Status Badge */}
                  <td className="py-3.5 px-5 align-middle text-right">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-safe/10 border border-safe/25 px-2.5 py-0.5 text-xs font-semibold text-safe">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Registered
                    </span>
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
