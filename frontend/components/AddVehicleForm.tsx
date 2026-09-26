"use client";

import { useState } from "react";
import { Plus, Check, ShieldPlus } from "lucide-react";
import type { RegisteredVehicle } from "@/lib/types";

interface AddVehicleFormProps {
  existingVehicles: RegisteredVehicle[];
  onAddVehicle: (newVehicle: RegisteredVehicle) => void;
}

export default function AddVehicleForm({
  existingVehicles,
  onAddVehicle,
}: AddVehicleFormProps) {
  const [plateText, setPlateText] = useState("");
  const [ownerLabel, setOwnerLabel] = useState("");
  const [errors, setErrors] = useState<{ plate?: string; owner?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedPlate = plateText.trim().toUpperCase();
    const trimmedOwner = ownerLabel.trim();
    const newErrors: { plate?: string; owner?: string } = {};

    if (!trimmedPlate) {
      newErrors.plate = "Please enter a license plate number.";
    } else {
      // Check for duplicate plate (case-insensitive)
      const isDuplicate = existingVehicles.some(
        (v) => v.plate_text.trim().toUpperCase() === trimmedPlate
      );
      if (isDuplicate) {
        newErrors.plate = "This vehicle is already registered.";
      }
    }

    if (!trimmedOwner) {
      newErrors.owner = "Please enter the resident or house label.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    // TODO: Persist registered vehicle addition to Supabase once backend is connected.
    // Currently updating local React state for hackathon demo session.
    const newVehicle: RegisteredVehicle = {
      plate_text: trimmedPlate,
      owner_label: trimmedOwner,
    };

    onAddVehicle(newVehicle);
    setPlateText("");
    setOwnerLabel("");
    setIsSubmitting(false);

    // Show temporary confirmation toast
    setSuccessMessage(`Vehicle ${trimmedPlate} successfully registered.`);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  return (
    <div className="w-full max-w-full rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          <ShieldPlus className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">Register New Vehicle</h2>
          <p className="text-xs text-muted-foreground">
            Added plates are verified automatically across all cameras.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-safe/10 border border-safe/25 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-safe animate-in fade-in slide-in-from-top-1 duration-200">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Plate Number Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="plate-input"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              License Plate <span className="text-alert">*</span>
            </label>
            <input
              id="plate-input"
              type="text"
              value={plateText}
              onChange={(e) => {
                setPlateText(e.target.value.toUpperCase());
                if (errors.plate) setErrors((prev) => ({ ...prev, plate: undefined }));
              }}
              placeholder="e.g. FSD-4422 or LEA-1092"
              className={`w-full min-h-[44px] rounded-xl border bg-background px-3.5 py-2 text-sm font-mono font-medium text-foreground placeholder:text-muted-foreground/60 shadow-xs transition-colors focus:outline-none focus:ring-2 ${
                errors.plate
                  ? "border-alert focus:border-alert focus:ring-alert/20"
                  : "border-border focus:border-primary focus:ring-primary/20"
              }`}
            />
            {errors.plate && (
              <p className="text-xs font-medium text-alert animate-in fade-in duration-150">
                {errors.plate}
              </p>
            )}
          </div>

          {/* Owner / House Label Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="owner-input"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Resident / House Label <span className="text-alert">*</span>
            </label>
            <input
              id="owner-input"
              type="text"
              value={ownerLabel}
              onChange={(e) => {
                setOwnerLabel(e.target.value);
                if (errors.owner) setErrors((prev) => ({ ...prev, owner: undefined }));
              }}
              placeholder="e.g. Tariq – House 18"
              className={`w-full min-h-[44px] rounded-xl border bg-background px-3.5 py-2 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 shadow-xs transition-colors focus:outline-none focus:ring-2 ${
                errors.owner
                  ? "border-alert focus:border-alert focus:ring-alert/20"
                  : "border-border focus:border-primary focus:ring-primary/20"
              }`}
            />
            {errors.owner && (
              <p className="text-xs font-medium text-alert animate-in fade-in duration-150">
                {errors.owner}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 cursor-pointer"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Add Vehicle</span>
          </button>
        </div>
      </form>
    </div>
  );
}
