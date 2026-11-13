"use client";

import { useState } from "react";
import { HardHat } from "lucide-react";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { EmptyState } from "@/components/ui/empty-state";
import { OhIodRecords } from "@/features/occupational-health/components/OhIodRecords";
import { OhIodForm } from "@/features/occupational-health/components/OhIodTabPanel";
import type { Customer } from "@/features/customers/types/customer.types";
import type { IodCase, OhVisitEncounter } from "@/features/occupational-health/types";

type OhIodVisitPanelProps = {
  customer: Customer | null;
  encounter: OhVisitEncounter;
  iodCases: IodCase[];
  onRefresh: () => void;
};

export function OhIodVisitPanel({
  customer,
  encounter,
  iodCases,
  onRefresh,
}: OhIodVisitPanelProps) {
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editing, setEditing] = useState<IodCase | null>(null);

  if (!customer?.id || customer.tenant == null) {
    return (
      <p className="text-[13px] text-dash-muted">Customer is required to record an injury on duty.</p>
    );
  }

  if (mode === "create" || (mode === "edit" && editing)) {
    return (
      <div className="space-y-3" data-testid="oh-iod-visit-form">
        <button
          type="button"
          className="text-[13px] font-medium text-brand-primary"
          onClick={() => {
            setMode("list");
            setEditing(null);
          }}
        >
          Back
        </button>
        <OhIodForm
          key={editing?.uuid ?? "new"}
          encounterId={encounter.id}
          customerId={customer.id}
          customerUuid={customer.uuid}
          tenantId={customer.tenant}
          existing={editing ?? undefined}
          onCreated={() => {
            onRefresh();
            setMode("list");
            setEditing(null);
          }}
          onSaved={() => {
            onRefresh();
            setMode("list");
            setEditing(null);
          }}
        />
      </div>
    );
  }

  if (iodCases.length === 0) {
    return (
      <EmptyState
        icon={HardHat}
        title="No injuries on duty"
        description="If this visit follows a workplace incident, open a case to start the statutory record."
        action={
          <PrimaryButton type="button" onClick={() => setMode("create")}>
            Open case
          </PrimaryButton>
        }
        data-testid="oh-iod-visit-empty"
      />
    );
  }

  return (
    <div className="space-y-3" data-testid="oh-iod-visit-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-semibold text-brand-navy">Injuries on duty</h2>
          <p className="text-[12px] text-dash-muted">{iodCases.length} on this visit</p>
        </div>
        <SecondaryButton type="button" onClick={() => setMode("create")}>
          Open case
        </SecondaryButton>
      </div>
      <OhIodRecords
        iodCases={iodCases}
        onEdit={(item) => {
          setEditing(item);
          setMode("edit");
        }}
      />
    </div>
  );
}
