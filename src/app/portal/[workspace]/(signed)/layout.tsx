import type { ReactNode } from "react";

import { PortalShell } from "@/app/employer-portal/_components/PortalShell";
import { appFont } from "@/lib/fonts";
import { QueryProvider } from "@/providers/query-provider";
import { ToastProvider } from "@/providers/toast-provider";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <div className={`${appFont.className} ${appFont.variable} min-h-svh bg-white`}>
      <QueryProvider>
        <ToastProvider>
          <PortalShell workspace={workspace}>{children}</PortalShell>
        </ToastProvider>
      </QueryProvider>
    </div>
  );
}
