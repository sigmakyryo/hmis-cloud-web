import { notFound } from "next/navigation";

import { PortalAnnualSummaryPage } from "@/app/employer-portal/_components/PortalAnnualSummaryPage";
import { PortalCompliancePage } from "@/app/employer-portal/_components/PortalCompliancePage";
import { PortalFitnessPage } from "@/app/employer-portal/_components/PortalFitnessPage";
import { PortalInvoicesPage } from "@/app/employer-portal/_components/PortalInvoicesPage";
import { PortalRequestsPage } from "@/app/employer-portal/_components/PortalRequestsPage";
import { PortalUsersPage } from "@/app/employer-portal/_components/PortalUsersPage";

const PAGES = {
  fitness: PortalFitnessPage,
  "annual-summary": PortalAnnualSummaryPage,
  "random-compliance": PortalCompliancePage,
  invoices: PortalInvoicesPage,
  requests: PortalRequestsPage,
  users: PortalUsersPage,
} as const;

export default async function Page({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const View = PAGES[page as keyof typeof PAGES];
  if (!View) {
    notFound();
  }
  return <View />;
}
