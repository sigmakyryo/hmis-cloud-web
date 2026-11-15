"use client";

import {
  ListPageHeaderSection,
  ListPageLayout,
  ListPageTableSection,
  ListPageToolbarSkeleton,
} from "@/features/app-shell/components/page-layout";
import { OpdQueueTableSkeleton } from "@/features/clinical-opd/components/OpdQueueTableSkeleton";
import { isEmployeeBasedOrganization } from "@/features/settings/utils/organization-type";
import { useUser } from "@/providers/user-provider";

export function OpdQueuePageSkeleton() {
  const { userData } = useUser();

  return (
    <ListPageLayout data-testid="opd-queue-page-skeleton">
      <ListPageHeaderSection>
        <ListPageToolbarSkeleton showFilter />
      </ListPageHeaderSection>

      <ListPageTableSection>
        <OpdQueueTableSkeleton
          rows={8}
          employeeBased={isEmployeeBasedOrganization(userData?.tenant)}
        />
      </ListPageTableSection>
    </ListPageLayout>
  );
}
