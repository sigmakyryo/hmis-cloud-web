import type { ReactNode } from "react";

import { OhModuleBar } from "@/features/occupational-health/components/OhModuleBar";

/** Route layout for OH-family sections. The body mirrors the app shell's scroll container. */
export function OhModuleLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <OhModuleBar />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-auto">{children}</div>
    </div>
  );
}
