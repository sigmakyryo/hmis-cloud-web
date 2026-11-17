"use client";

import type { ReactNode } from "react";

import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import { EmployersTabNav } from "@/features/employer-portal/admin/components/EmployersTabNav";
import { useOrganizationLogoSync } from "@/features/employer-portal/admin/hooks/useOrganizationLogoSync";

/** Frame for every /employers page: screen-reader title plus the section tabs. */
export function EmployersLayout({ children }: { children: ReactNode }) {
  useOrganizationLogoSync();
  return (
    <ImmPageShell title="Employers" testId="oh-employer-portal-admin">
      <EmployersTabNav />
      {children}
    </ImmPageShell>
  );
}
