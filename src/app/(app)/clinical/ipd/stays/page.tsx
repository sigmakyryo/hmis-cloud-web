import { Suspense } from "react";

import { PageLoader } from "@/components/page-loader";
import { IpdActiveStaysPage } from "@/features/clinical-ipd/pages/IpdActiveStaysPage";

export default function Page() {
  return (
    <Suspense fallback={<PageLoader message="Loading stays..." />}>
      <IpdActiveStaysPage />
    </Suspense>
  );
}
