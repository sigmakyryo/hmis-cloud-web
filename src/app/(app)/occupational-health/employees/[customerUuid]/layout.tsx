import type { ReactNode } from "react";

import { OhEmployeeDetailPage } from "@/features/occupational-health/pages/OhEmployeeDetailPage";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ customerUuid: string }>;
};

export default async function OhEmployeeDetailLayout({ children, params }: LayoutProps) {
  const { customerUuid } = await params;
  return <OhEmployeeDetailPage customerUuid={customerUuid}>{children}</OhEmployeeDetailPage>;
}
