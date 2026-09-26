"use client";

import { useEffect, useState, useCallback } from "react";
import { getRegisteredVehicles } from "@/lib/data";
import type { RegisteredVehicle } from "@/lib/types";
import AddVehicleForm from "@/components/AddVehicleForm";
import RegisteredVehiclesTable from "@/components/RegisteredVehiclesTable";
import { FadeIn } from "@/components/FadeIn";
import { ShieldCheck } from "lucide-react";

export default function RegisteredPage() {
  const [vehicles, setVehicles] = useState<RegisteredVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const data = await getRegisteredVehicles();
        if (isMounted) {
          setVehicles(data || []);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to load registered vehicles:", err);
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle local registration of a new vehicle for the hackathon demo session.
  // TODO: Persist registered vehicle additions to Supabase once backend is connected.
  // Currently updating local React state for hackathon demo session.
  const handleAddVehicle = useCallback((newVehicle: RegisteredVehicle) => {
    setVehicles((prev) => [newVehicle, ...prev]);
  }, []);

  return (
    <div className="space-y-10 pb-16">
      {/* Page Header */}
      <FadeIn>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Colony Vehicle Registry
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Registered Vehicles
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg max-w-3xl leading-relaxed">
            Vehicles recognized by residents of this colony. Any vehicle not on this list will be
            flagged for awareness, not accusation.
          </p>
        </div>
      </FadeIn>

      {/* Add Vehicle Section */}
      <FadeIn delay={100}>
        <AddVehicleForm
          existingVehicles={vehicles}
          onAddVehicle={handleAddVehicle}
        />
      </FadeIn>

      {/* Registered Vehicles Table Section */}
      <FadeIn delay={175}>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Colony Roster
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Plates on this list are automatically classified as known resident vehicles.
              </p>
            </div>

            {!isLoading && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-safe/10 border border-safe/25 px-3 py-1 text-xs font-bold text-safe">
                <span className="h-2 w-2 rounded-full bg-safe" />
                {vehicles.length} {vehicles.length === 1 ? "vehicle" : "vehicles"}
              </span>
            )}
          </div>

          <RegisteredVehiclesTable vehicles={vehicles} />
        </div>
      </FadeIn>
    </div>
  );
}
