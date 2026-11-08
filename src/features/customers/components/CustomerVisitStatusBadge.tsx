import {
  StatusDotBadge,
  type StatusDotBadgeTone,
} from "@/components/ui/status-dot-badge";
import type { CustomerVisitStatus } from "@/features/customers/types/customer-visit-status.types";
import { formatCustomerVisitStatusLabel } from "@/features/customers/utils/customer-visit-status";

type CustomerVisitStatusBadgeProps = {
  status: CustomerVisitStatus | string | undefined;
  lastVisitAt?: string | null;
  className?: string;
};

const TONES: Record<string, StatusDotBadgeTone> = {
  active: "success",
  completed: "primary",
  cancelled: "danger",
};

export function CustomerVisitStatusBadge({
  status,
  lastVisitAt,
  className,
}: CustomerVisitStatusBadgeProps) {
  const resolvedStatus = status ?? "not_started";
  const tone =
    resolvedStatus === "completed" || resolvedStatus === "not_started"
      ? lastVisitAt
        ? "primary"
        : "neutral"
      : (TONES[resolvedStatus] ?? "neutral");

  return (
    <StatusDotBadge tone={tone} className={className}>
      {formatCustomerVisitStatusLabel(resolvedStatus, { lastVisitAt })}
    </StatusDotBadge>
  );
}
