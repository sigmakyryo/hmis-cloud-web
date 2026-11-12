import { redirect } from "next/navigation";

import { theatreLegacySegmentHref } from "@/features/clinical-theatre/constants/theatre-workspace-routing";

type Props = {
  params: Promise<{ visitUuid: string; encounterUuid: string }>;
  searchParams: Promise<{ section?: string | string[] }>;
};

/** Old "team" URL: now a step of the theatre case flow. */
export default async function Page({ params, searchParams }: Props) {
  const { visitUuid, encounterUuid } = await params;
  const { section } = await searchParams;
  redirect(
    theatreLegacySegmentHref(
      visitUuid,
      encounterUuid,
      "team",
      typeof section === "string" ? section : null,
    ),
  );
}
