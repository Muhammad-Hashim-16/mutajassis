"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { getCameras, getRegisteredVehicles, getSightings, getVehicleSummary } from "@/lib/data";
import type { Camera, RegisteredVehicle, Sighting, VehicleSummary } from "@/lib/types";
import VehicleSummaryCard from "@/components/VehicleSummaryCard";
import VehicleTimelineNode from "@/components/VehicleTimelineNode";
import { FadeIn } from "@/components/FadeIn";
import { Car, Route, ChevronDown, ShieldAlert, Check } from "lucide-react";

function isPlateLike(key?: string | null): boolean {
  if (!key) return false;
  return /^[A-Z]{2,4}-\d{3,4}$/i.test(key.trim()) || key.includes("-");
}

export default function TimelinePage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [vehicleSummaries, setVehicleSummaries] = useState<VehicleSummary[]>([]);
  const [registeredVehicles, setRegisteredVehicles] = useState<RegisteredVehicle[]>([]);
  const [selectedVehicleKey, setSelectedVehicleKey] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [cams, sights, summaries, regs] = await Promise.all([
          getCameras(),
          getSightings(),
          getVehicleSummary(),
          getRegisteredVehicles(),
        ]);

        if (isMounted) {
          setCameras(cams || []);
          setSightings(sights || []);
          setVehicleSummaries(summaries || []);
          setRegisteredVehicles(regs || []);

          // Automatically default-select the FIRST vehicle with 2+ sightings (cross-camera case)
          // or fallback to the first vehicle in the list
          if (summaries && summaries.length > 0) {
            const crossCameraVehicle = summaries.find(
              (v) => (v.sighting_ids || []).length >= 2
            );
            const initialKey = crossCameraVehicle
              ? crossCameraVehicle.vehicle_key
              : summaries[0].vehicle_key;
            setSelectedVehicleKey(initialKey);
          }

          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to load timeline data:", err);
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sort vehicle selector options: vehicles with 2+ sightings appear FIRST (cross-camera showcase),
  // then single-sighting vehicles
  const sortedVehicleOptions = useMemo(() => {
    return [...vehicleSummaries].sort((a, b) => {
      const aCount = (a.sighting_ids || []).length;
      const bCount = (b.sighting_ids || []).length;
      if (aCount >= 2 && bCount < 2) return -1;
      if (aCount < 2 && bCount >= 2) return 1;
      return 0;
    });
  }, [vehicleSummaries]);

  // Selected vehicle summary object
  const currentSummary = useMemo(() => {
    return vehicleSummaries.find((v) => v.vehicle_key === selectedVehicleKey);
  }, [vehicleSummaries, selectedVehicleKey]);

  // Map camera IDs to camera names for fast, safe resolution
  const cameraMap = useMemo(() => {
    return new Map<string, string>(cameras.map((c) => [c.id, c.name]));
  }, [cameras]);

  // Resolve and sort sightings for the selected vehicle
  const resolvedSightings = useMemo(() => {
    if (!currentSummary?.sighting_ids || currentSummary.sighting_ids.length === 0) {
      return [];
    }

    const sightingMap = new Map<string, Sighting>(sightings.map((s) => [s.id, s]));
    const matched: Sighting[] = [];

    for (const sId of currentSummary.sighting_ids) {
      const s = sightingMap.get(sId);
      if (s) {
        matched.push(s);
      }
    }

    // Sort chronologically ascending
    return matched.sort((a, b) => a.first_seen_sec - b.first_seen_sec);
  }, [currentSummary, sightings]);

  // Distinct camera count for the selected vehicle
  const distinctCameraCount = useMemo(() => {
    const camIds = new Set(resolvedSightings.map((s) => s.camera_id));
    return camIds.size;
  }, [resolvedSightings]);

  if (!isLoading && vehicleSummaries.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center shadow-sm">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Car className="h-7 w-7" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold text-foreground">No vehicle activity recorded yet.</h2>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          Vehicles tracked across neighborhood cameras will produce movement timelines here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-16">
      <style>{`
        @keyframes nodeSlideIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-node-in {
          animation: nodeSlideIn 0.35s ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-node-in {
            animation: none !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <FadeIn>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Route className="h-3.5 w-3.5" />
            Cross-Camera Re-identification
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Vehicle Timeline
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Trace a vehicle's movement across every camera in the neighborhood.
          </p>
        </div>
      </FadeIn>

      {/* Vehicle Selector Bar with Custom UI Dropdown */}
      <div
        className="relative z-50 w-full max-w-full rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"
        style={{ position: "relative", zIndex: 50 }}
      >
        <div className="space-y-0.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Select Vehicle to Trace
          </span>
          <p className="text-xs text-muted-foreground">
            Vehicles identified across multiple cameras are prioritized first.
          </p>
        </div>

        <div
          ref={dropdownRef}
          className="relative z-50 w-full sm:w-auto sm:min-w-[340px] max-w-full"
          style={{ position: "relative", zIndex: 50 }}
        >
          {/* Custom Dropdown Trigger Button */}
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            className="w-full min-h-[46px] rounded-xl border border-border bg-background hover:bg-muted/40 px-4 py-2.5 text-sm font-semibold text-foreground shadow-xs transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 flex items-center justify-between gap-3 cursor-pointer"
          >
              <div className="flex items-center gap-2.5 truncate">
                <span className="font-mono text-base font-bold tracking-tight text-foreground truncate">
                  {isPlateLike(selectedVehicleKey)
                    ? selectedVehicleKey
                    : `Unidentified (ID: ${selectedVehicleKey})`}
                </span>
                {((sortedVehicleOptions.find((v) => v.vehicle_key === selectedVehicleKey)?.sighting_ids || []).length >= 2) ? (
                  <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-semibold text-primary shrink-0">
                    ★ {(sortedVehicleOptions.find((v) => v.vehicle_key === selectedVehicleKey)?.sighting_ids || []).length} cameras
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-muted border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground shrink-0">
                    1 camera
                  </span>
                )}
              </div>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                  dropdownOpen ? "rotate-180 text-primary" : ""
                }`}
              />
            </button>

            {/* Custom Dropdown Popover (stacked in front with zIndex 9999) */}
            {dropdownOpen && (
              <div
                role="listbox"
                style={{ position: "absolute", zIndex: 9999 }}
                className="absolute right-0 top-full mt-2 w-full sm:w-[380px] z-[9999] rounded-2xl border border-border bg-card shadow-2xl p-2 space-y-1 max-h-[340px] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1">
                  Select a vehicle ({sortedVehicleOptions.length} recorded)
                </div>
                {sortedVehicleOptions.map((v) => {
                  const count = (v.sighting_ids || []).length;
                  const isPlate = isPlateLike(v.vehicle_key);
                  const label = isPlate
                    ? v.vehicle_key
                    : `Unidentified (ID: ${v.vehicle_key})`;
                  const isSelected = v.vehicle_key === selectedVehicleKey;

                  return (
                    <button
                      key={v.vehicle_key}
                      type="button"
                      onMouseDown={(e) => {
                        // Prevent mousedown from triggering handleClickOutside prematurely
                        e.stopPropagation();
                      }}
                      onClick={() => {
                        setSelectedVehicleKey(v.vehicle_key);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-primary/10 text-primary font-bold"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {isSelected ? (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        ) : (
                          <span className="w-4 shrink-0" />
                        )}
                        <span className="font-mono text-sm tracking-tight truncate">
                          {label}
                        </span>
                      </div>
                      {count >= 2 ? (
                        <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary shrink-0 ml-2">
                          ★ {count} cameras
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-muted/80 px-2 py-0.5 text-xs text-muted-foreground shrink-0 ml-2">
                          1 camera
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      {/* Main Layout: Summary Card + Timeline */}
      {currentSummary && (
        <div style={{ position: "relative", zIndex: 1 }}>
          <FadeIn delay={150}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Column: Vehicle Summary Card */}
            <div className="lg:col-span-1 lg:sticky lg:top-20 space-y-4">
              <VehicleSummaryCard
                summary={currentSummary}
                registeredVehicles={registeredVehicles}
                cameraCount={distinctCameraCount}
                totalSightings={resolvedSightings.length}
              />
            </div>

            {/* Right Column: Timeline Journey */}
            <div className="lg:col-span-2 space-y-6">
              {/* Highlight Badge */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                {distinctCameraCount >= 2 ? (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-primary shadow-xs">
                    <Route className="h-4 w-4 shrink-0" />
                    <span>Tracked across {distinctCameraCount} cameras in the colony</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-muted/70 border border-border px-3.5 py-1.5 text-xs sm:text-sm font-medium text-muted-foreground">
                    <span>Detected at a single camera — plate not seen elsewhere yet.</span>
                  </div>
                )}

                <span className="text-xs text-muted-foreground font-mono">
                  {resolvedSightings.length}{" "}
                  {resolvedSightings.length === 1 ? "sighting" : "sightings"} in sequence
                </span>
              </div>

              {/* Timeline Nodes Container */}
              {resolvedSightings.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
                  <ShieldAlert className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    No detailed sighting data available for this vehicle.
                  </p>
                </div>
              ) : (
                <div key={selectedVehicleKey} className="pt-2">
                  {resolvedSightings.map((sighting, index) => {
                    const cameraName = cameraMap.get(sighting.camera_id) || "Unknown Camera";
                    const isFirst = index === 0;
                    const isLast = index === resolvedSightings.length - 1;

                    return (
                      <VehicleTimelineNode
                        key={sighting.id}
                        sighting={sighting}
                        cameraName={cameraName}
                        index={index}
                        isFirst={isFirst}
                        isLast={isLast}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </FadeIn>
      </div>
    )}
  </div>
);
}
