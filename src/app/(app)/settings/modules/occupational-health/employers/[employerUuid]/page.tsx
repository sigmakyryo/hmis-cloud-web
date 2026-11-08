import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";

type PageProps = {
  params: Promise<{ employerUuid: string }>;
  searchParams: Promise<{ section?: string }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { employerUuid } = await params;
  const { section } = await searchParams;
  const parsed =
    section === "departments" || section === "job-titles" ? section : undefined;

  redirect(ROUTES.settingsOccupationalHealthEmployer(employerUuid, parsed));
}
