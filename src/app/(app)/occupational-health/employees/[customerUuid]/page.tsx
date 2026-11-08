import { OhEmployeeDetailPage } from "@/features/occupational-health/pages/OhEmployeeDetailPage";

type PageProps = { params: Promise<{ customerUuid: string }> };

export default async function Page({ params }: PageProps) {
  const { customerUuid } = await params;
  return <OhEmployeeDetailPage customerUuid={customerUuid} />;
}
