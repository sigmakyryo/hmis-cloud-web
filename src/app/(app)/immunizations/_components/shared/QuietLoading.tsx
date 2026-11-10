"use client";

import { Loader2 } from "lucide-react";

export function QuietLoading() {
  return (
    <p className="flex items-center gap-2 text-[13px] text-dash-muted">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      Loading…
    </p>
  );
}

