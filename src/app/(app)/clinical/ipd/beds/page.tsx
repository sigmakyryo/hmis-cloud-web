import { Suspense } from "react";

import { PageLoader } from "@/components/page-loader";
import { IpdBedManagementPage } from "@/features/clinical-ipd/pages/IpdBedManagementPage";

export default function Page() {
  return (
    <Suspense fallback={<PageLoader message="Loading beds..." />}>
      <IpdBedManagementPage />
    </Suspense>
  );
}
