import { Suspense } from "react";

import { PageLoader } from "@/components/page-loader";
import { TheatreQueuePage } from "@/features/clinical-theatre/pages/TheatreQueuePage";

export default function Page() {
  return (
    <Suspense fallback={<PageLoader message="Loading theatre queue..." />}>
      <TheatreQueuePage />
    </Suspense>
  );
}
