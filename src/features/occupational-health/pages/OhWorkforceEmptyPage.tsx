"use client";

import { Construction } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { ListPageLayout } from "@/features/app-shell/components/page-layout";

type OhWorkforceEmptyPageProps = {
  title: string;
  testId: string;
};

export function OhWorkforceEmptyPage({ title, testId }: OhWorkforceEmptyPageProps) {
  return (
    <ListPageLayout data-testid={testId}>
      <div className="flex min-h-[24rem] items-center justify-center">
        <EmptyState
          icon={Construction}
          title={`${title} is not set up yet`}
          description="This section is in the occupational health menu. Capture for these records is not available yet."
        />
      </div>
    </ListPageLayout>
  );
}
