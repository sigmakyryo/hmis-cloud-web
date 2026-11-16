import type { ReactNode } from "react";

import { appFont } from "@/lib/fonts";
import { QueryProvider } from "@/providers/query-provider";
import { ToastProvider } from "@/providers/toast-provider";

import { PortalShell } from "./_components/PortalShell";

/** Employer portal: its own minimal shell, outside the clinic dashboard. */
export default function EmployerPortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${appFont.className} ${appFont.variable} min-h-svh bg-white`}>
      <QueryProvider>
        <ToastProvider>
          <PortalShell>{children}</PortalShell>
        </ToastProvider>
      </QueryProvider>
    </div>
  );
}
