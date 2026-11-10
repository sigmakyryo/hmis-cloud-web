import { Suspense } from "react";

import { OhHomePage } from "@/features/occupational-health/pages/OhHomePage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <OhHomePage />
    </Suspense>
  );
}
