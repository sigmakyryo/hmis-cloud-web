"use client";

import type { OhVisitBillingCharge } from "@/features/occupational-health/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  pending: "Sending",
  sent: "On the bill",
  failed: "Failed",
  removed: "Removed",
};

function statusTone(status: string): string {
  switch (status) {
    case "sent":
      return "text-emerald-800";
    case "failed":
      return "text-red-700";
    case "removed":
      return "text-dash-muted line-through";
    default:
      return "text-amber-800";
  }
}

function chargeLabel(charge: OhVisitBillingCharge): string {
  if (charge.item_code?.trim()) {
    return charge.item_code.trim();
  }
  if (charge.scope === "form") {
    return "Form";
  }
  return charge.billing_key;
}

type OhVisitBillingListProps = {
  charges: OhVisitBillingCharge[];
  compact?: boolean;
};

export function OhVisitBillingList({
  charges,
  compact = false,
}: OhVisitBillingListProps) {
  const open = charges.filter((charge) => charge.status !== "removed");
  const removed = charges.filter((charge) => charge.status === "removed");

  if (charges.length === 0) {
    return (
      <p
        className={cn(
          "text-[13px] text-dash-muted",
          compact ? "px-0 py-1" : "px-5 py-4",
        )}
        data-testid="oh-billing-empty"
      >
        No billing items on this visit yet. Items are added when billable exam
        or form answers are saved.
      </p>
    );
  }

  return (
    <div
      className={cn(compact ? "space-y-3" : "px-5 py-4")}
      data-testid="oh-billing-list"
    >
      <ul className="divide-y divide-dash-border/80">
        {open.map((charge) => (
          <li
            key={charge.uuid || charge.billing_key}
            className="flex items-start justify-between gap-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-brand-navy">
                {chargeLabel(charge)}
              </p>
              <p className="text-[11px] text-dash-muted">
                {charge.destination === "lab" ? "Laboratory" : "Billing"}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 text-[11px] font-medium",
                statusTone(charge.status),
              )}
            >
              {charge.ui_status?.trim() ||
                STATUS_LABEL[charge.status] ||
                charge.status}
            </span>
          </li>
        ))}
      </ul>
      {removed.length > 0 ? (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
            Removed
          </p>
          <ul>
            {removed.map((charge) => (
              <li
                key={charge.uuid || charge.billing_key}
                className="flex items-center justify-between gap-3 py-1 text-[12px] text-dash-muted"
              >
                <span className="truncate line-through">
                  {chargeLabel(charge)}
                </span>
                <span>{charge.ui_status?.trim() || "Removed from bill"}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
