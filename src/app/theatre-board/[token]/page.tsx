import type { Metadata } from "next";

import { TheatreFamilyKiosk } from "@/features/clinical-theatre/components/TheatreFamilyKiosk";

export const metadata: Metadata = {
  title: "Theatre patient status",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

/** Public waiting-area screen (no login). Shows only patient codes and stages. */
export default async function TheatreFamilyKioskPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <TheatreFamilyKiosk token={token} />;
}
