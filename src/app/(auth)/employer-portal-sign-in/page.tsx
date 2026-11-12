import { PortalSignIn } from "@/features/employer-portal/components/PortalSignIn";

export default async function Page({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const { org } = await searchParams;
  return <PortalSignIn org={typeof org === "string" ? org : ""} />;
}
