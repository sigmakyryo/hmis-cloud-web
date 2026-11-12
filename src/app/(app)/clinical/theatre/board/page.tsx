import { Suspense } from "react";

import { PageLoader } from "@/components/page-loader";
import { TheatreBoardPage } from "@/features/clinical-theatre/pages/TheatreBoardPage";

export default function Page() {
  return (
    <Suspense fallback={<PageLoader message="Loading theatre board..." />}>
      <TheatreBoardPage />
    </Suspense>
  );
}
