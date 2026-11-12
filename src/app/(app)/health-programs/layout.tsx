import type { ReactNode } from "react";

import { OhModuleLayout } from "@/features/occupational-health/components/OhModuleLayout";

export default function Layout({ children }: { children: ReactNode }) {
  return <OhModuleLayout>{children}</OhModuleLayout>;
}
