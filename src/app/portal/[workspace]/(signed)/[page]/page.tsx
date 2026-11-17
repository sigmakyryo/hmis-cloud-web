import { notFound, redirect } from "next/navigation";

import { PortalAnnualSummaryPage } from "@/app/employer-portal/_components/PortalAnnualSummaryPage";
import { PortalCompliancePage } from "@/app/employer-portal/_components/PortalCompliancePage";
import { PortalFitnessPage } from "@/app/employer-portal/_components/PortalFitnessPage";
import { PortalInvoicesPage } from "@/app/employer-portal/_components/PortalInvoicesPage";
import { PortalRequestsPage } from "@/app/employer-portal/_components/PortalRequestsPage";
import { PortalEmployeesPage } from "@/app/employer-portal/_components/PortalEmployeesPage";

const PAGES = {
  fitness: PortalFitnessPage,
  "annual-summary": PortalAnnualSummaryPage,
  "random-compliance": PortalCompliancePage,
  invoices: PortalInvoicesPage,
  requests: PortalRequestsPage,
  employees: PortalEmployeesPage,
} as const;

export default async function Page({ params }: { params: Promise<{ workspace: string; page: string }> }) {
  const { workspace, page } = await params;
  if (page === "users") {
    redirect(`/portal/${workspace}/employees`);
  }
  const View = PAGES[page as keyof typeof PAGES];
  if (!View) {
    notFound();
  }
  return <View />;
}
