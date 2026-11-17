import { Suspense } from "react";

import { SsoContinueClient } from "@/features/auth/components/SsoContinueClient";

export default function AuthSsoContinuePage() {
  return (
    <Suspense fallback={null}>
      <SsoContinueClient />
    </Suspense>
  );
}
