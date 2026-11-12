"use client";

import type { ReactNode } from "react";

import { ListPageLayout } from "@/features/app-shell/components/page-layout";

/** Page frame for immunization screens. The sidebar names the page, so the title is for screen readers only. */
export function ImmPageShell({
  title,
  testId,
  children,
}: {
  title: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <ListPageLayout data-testid={testId} className="bg-white">
      <h1 data-list-band className="sr-only">
        {title}
      </h1>
      {children}
    </ListPageLayout>
  );
}
