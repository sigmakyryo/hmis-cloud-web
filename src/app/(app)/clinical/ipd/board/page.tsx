import { Suspense } from "react";

import { PageLoader } from "@/components/page-loader";
import { IpdWardBoardPage } from "@/features/clinical-ipd/pages/IpdWardBoardPage";

export default function Page() {
  return (
    <Suspense fallback={<PageLoader message="Loading ward board..." />}>
      <IpdWardBoardPage />
    </Suspense>
  );
}
