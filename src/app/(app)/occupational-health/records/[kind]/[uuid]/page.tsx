import { OhRecordDetailPage } from "@/features/occupational-health/pages/OhRecordDetailPage";

type PageProps = {
  params: Promise<{ kind: string; uuid: string }>;
};

export default async function Page({ params }: PageProps) {
  const { kind, uuid } = await params;
  return <OhRecordDetailPage kind={kind} uuid={uuid} />;
}
