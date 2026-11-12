"use client";

import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import type { TheatreCaseSafety } from "@/features/clinical-theatre/types/clinical-theatre.types";

const ITEMS: { key: keyof TheatreCaseSafety; label: string }[] = [
  { key: "pre_op_ready", label: "Pre-op" },
  { key: "sign_in", label: "Sign in" },
  { key: "time_out", label: "Time out" },
  { key: "sign_out", label: "Sign out" },
];

/** Compact WHO checklist / pre-op progress badges for board and case cards. */
export function TheatreSafetyBadges({ safety }: { safety?: TheatreCaseSafety }) {
  if (!safety) return null;
  return (
    <div className="flex flex-wrap gap-1" data-testid="theatre-safety-badges">
      {ITEMS.map((item) => (
        <StatusDotBadge
          key={item.key}
          tone={safety[item.key] ? "success" : "neutral"}
        >
          {item.label}
        </StatusDotBadge>
      ))}
    </div>
  );
}
