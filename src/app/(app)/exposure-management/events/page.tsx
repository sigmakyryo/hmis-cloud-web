import { Suspense } from "react";

import { ExposureEventsPage } from "@/features/exposure-management/pages/ExposureEventsPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ExposureEventsPage />
    </Suspense>
  );
}
