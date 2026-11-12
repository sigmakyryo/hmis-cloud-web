import { Suspense } from "react";

import { PageLoader } from "@/components/page-loader";
import { TheatrePreOpClinicPage } from "@/features/clinical-theatre/pages/TheatrePreOpClinicPage";

export default function Page() {
  return (
    <Suspense fallback={<PageLoader message="Loading pre-op clinic..." />}>
      <TheatrePreOpClinicPage />
    </Suspense>
  );
}
