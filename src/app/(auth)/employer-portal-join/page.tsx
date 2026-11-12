import { PortalJoinForm } from "@/features/employer-portal/components/PortalJoinForm";

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <PortalJoinForm token={typeof token === "string" ? token : ""} />;
}
