import type { ReactNode } from "react";

import { EmployersLayout } from "@/features/employer-portal/admin/components/EmployersLayout";

export default function Layout({ children }: { children: ReactNode }) {
  return <EmployersLayout>{children}</EmployersLayout>;
}
