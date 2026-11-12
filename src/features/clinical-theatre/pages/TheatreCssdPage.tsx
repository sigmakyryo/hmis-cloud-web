"use client";

import { useState } from "react";

import { useMyClinicalCapabilities } from "@/features/clinical-opd/hooks/use-clinical-opd";
import { TheatreCssdCyclesTab } from "@/features/clinical-theatre/components/TheatreCssdCyclesTab";
import { TheatreCssdTraysTab } from "@/features/clinical-theatre/components/TheatreCssdTraysTab";
import { cn } from "@/lib/utils";

type Tab = "trays" | "cycles";

/** CSSD: instrument trays and the sterilisation cycle log. */
export function TheatreCssdPage() {
  const { data } = useMyClinicalCapabilities();
  const capabilities = data?.capabilities ?? [];
  const canSterilise = capabilities.includes("record_theatre_sterilisation");
  const canQuarantine = canSterilise || capabilities.includes("manage_theatre_trays");
  const [tab, setTab] = useState<Tab>("trays");
  return (
    <div className="space-y-4 p-4" data-testid="theatre-cssd-page">
      <div>
        <h1 className="text-xl font-semibold text-brand-navy">CSSD &amp; instrument trays</h1>
        <p className="text-sm text-muted-foreground">
          Track every tray from sterilisation to the patient and back. Expired, unsterile or
          failed-indicator trays cannot be assigned to a case.
        </p>
      </div>
      <nav aria-label="CSSD views" className="inline-flex gap-1 rounded-lg bg-slate-100 p-1">
        {(
          [
            { id: "trays", label: "Trays" },
            { id: "cycles", label: "Sterilisation cycles" },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={tab === option.id}
            onClick={() => setTab(option.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              tab === option.id ? "bg-white text-brand-navy shadow-sm" : "text-brand-muted",
            )}
          >
            {option.label}
          </button>
        ))}
      </nav>
      {tab === "trays" ? (
        <TheatreCssdTraysTab canQuarantine={canQuarantine} />
      ) : (
        <TheatreCssdCyclesTab canRecord={canSterilise} />
      )}
    </div>
  );
}
