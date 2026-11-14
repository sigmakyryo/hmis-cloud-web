import { Suspense } from "react";

import { PageLoader } from "@/components/page-loader";
import { OhFormsPage } from "@/features/occupational-health/pages/OhFormsPage";

export default function Page() {
  return (
    <Suspense fallback={<PageLoader message="Loading forms..." />}>
      <OhFormsPage />
    </Suspense>
  );
}
