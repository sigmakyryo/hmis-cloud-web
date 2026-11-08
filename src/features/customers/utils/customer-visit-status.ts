import type { CustomerVisitStatus } from "@/features/customers/types/customer-visit-status.types";
import { formatLastVisitBadgeLabel } from "@/lib/format-relative-time";

export function isCustomerVisitActive(
  status: CustomerVisitStatus | string | undefined,
): boolean {
  return status === "active";
}

export function formatCustomerVisitStatusLabel(
  status: CustomerVisitStatus | string | undefined,
  options?: { lastVisitAt?: string | null; now?: Date },
): string {
  switch (status) {
    case "active":
      return "Active";
    case "cancelled":
      return "Cancelled";
    case "completed":
      return formatLastVisitBadgeLabel(options?.lastVisitAt, { now: options?.now });
    case "not_started":
    default:
      if (options?.lastVisitAt) {
        return formatLastVisitBadgeLabel(options.lastVisitAt, { now: options?.now });
      }
      return "No visits";
  }
}

export function normalizeCustomerVisitStatus(
  status: string | undefined,
): CustomerVisitStatus {
  if (
    status === "active" ||
    status === "completed" ||
    status === "cancelled" ||
    status === "not_started"
  ) {
    return status;
  }

  return "not_started";
}
