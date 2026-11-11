"use client";

import { useEffect, useState } from "react";

import { LoginForm } from "@/features/auth/components/LoginForm";
import { PortalBrandBanner } from "@/features/employer-portal/components/PortalBrandBanner";
import { fetchPublicBranding } from "@/features/employer-portal/services/employer-portal-public.service";
import type { PortalBranding } from "@/features/employer-portal/services/employer-portal.service";

export function PortalSignIn({ org }: { org: string }) {
  const [branding, setBranding] = useState<PortalBranding | null>(null);
  useEffect(() => {
    if (!org) return;
    fetchPublicBranding(org).then(setBranding).catch(() => setBranding(null));
  }, [org]);
  return (
    <div data-testid="employer-portal-sign-in">
      <div className="mx-auto max-w-md px-6 pt-10">
        <PortalBrandBanner branding={branding} fallback="Employer portal" />
      </div>
      <LoginForm />
    </div>
  );
}
