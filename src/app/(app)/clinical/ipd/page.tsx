import { Suspense } from "react";

import { PageLoader } from "@/components/page-loader";
import { IpdQueuePage } from "@/features/clinical-ipd/pages/IpdQueuePage";

export default function Page() {
  return (
    <Suspense fallback={<PageLoader message="Loading IPD queue..." />}>
      <IpdQueuePage />
    </Suspense>
  );
}
