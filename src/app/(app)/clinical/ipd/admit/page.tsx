import { Suspense } from "react";

import { PageLoader } from "@/components/page-loader";
import { IpdAdmitPage } from "@/features/clinical-ipd/pages/IpdAdmitPage";

export default function Page() {
  return (
    <Suspense fallback={<PageLoader message="Loading admit..." />}>
      <IpdAdmitPage />
    </Suspense>
  );
}
