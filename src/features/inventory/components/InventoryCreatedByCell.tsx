"use client";

import { UserIdenticon } from "@/components/UserIdenticon";
import { cn } from "@/lib/utils";

type InventoryCreatedByCellProps = {
  name?: string | null;
  imageUrl?: string | null;
  size?: "default" | "sm";
  tone?: "default" | "muted";
};

export function InventoryCreatedByCell({
  name,
  imageUrl,
  size = "default",
  tone = "default",
}: InventoryCreatedByCellProps) {
  const label = name?.trim();

  if (!label) {
    return <span className="text-sm text-dash-muted">Unknown</span>;
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <UserIdenticon
        seed={label}
        name={label}
        imageUrl={imageUrl}
        fallback="initials"
        className={cn(
          "shrink-0 rounded-md",
          size === "sm" ? "size-5" : "size-7",
        )}
        fallbackClassName={cn(
          "rounded-md bg-brand-tint text-brand-navy",
          size === "sm" ? "text-[9px]" : "text-[11px]",
        )}
      />
      <span
        className={cn(
          "truncate text-sm",
          tone === "muted" ? "text-dash-muted" : "text-brand-navy",
        )}
      >
        {label}
      </span>
    </div>
  );
}
