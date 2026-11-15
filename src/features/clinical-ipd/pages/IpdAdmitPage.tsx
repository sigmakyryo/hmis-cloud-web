"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { ROUTES } from "@/constants/routes";
import { IpdAdmitSheet } from "@/features/clinical-ipd/components/IpdAdmitSheet";

/** Keeps the old admit URL working. The form itself is the shared sheet. */
export function IpdAdmitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaults = useMemo(
    () => ({
      clinicUuid: searchParams.get("clinic") || undefined,
      wardUuid: searchParams.get("ward") || undefined,
      bedUuid: searchParams.get("bed") || undefined,
    }),
    [searchParams],
  );

  return (
    <IpdAdmitSheet
      open
      defaults={defaults}
      onOpenChange={(next) => {
        if (!next) router.push(ROUTES.clinicalIpdBoard);
      }}
    />
  );
}
