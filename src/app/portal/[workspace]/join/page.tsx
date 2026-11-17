import { PortalJoinForm } from "@/features/employer-portal/components/PortalJoinForm";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { workspace } = await params;
  const { token } = await searchParams;
  return <PortalJoinForm token={typeof token === "string" ? token : ""} workspace={workspace} />;
}
