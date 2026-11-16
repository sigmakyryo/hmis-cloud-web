import { PortalWorkspaceSignIn } from "@/features/employer-portal/components/PortalSignIn";

export default async function Page({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return <PortalWorkspaceSignIn workspace={workspace} />;
}
