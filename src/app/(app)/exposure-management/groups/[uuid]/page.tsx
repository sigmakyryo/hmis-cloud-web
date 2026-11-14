import { ExposureGroupDetailPage } from "@/features/exposure-management/pages/ExposureGroupDetailPage";

export default async function Page({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  return <ExposureGroupDetailPage uuid={uuid} />;
}
