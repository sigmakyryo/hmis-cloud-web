"use client";

import { Loader2 } from "lucide-react";

export function QuietLoading() {
  return (
    <p data-list-band className="flex items-center gap-2 px-4 py-10 text-[13px] text-dash-muted md:px-6">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      Loading…
    </p>
  );
}

export function LoadError({ children }: { children: string }) {
  return (
    <p data-list-band className="px-4 py-10 text-[13px] text-red-700 md:px-6" role="alert">
      {children}
    </p>
  );
}
