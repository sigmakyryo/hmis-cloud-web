"use client";

import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { OH_RISK_PROFILE_REQUIRED_MESSAGE } from "@/features/occupational-health/utils/customer-has-risk-profile";

type OhRiskProfileRequiredNoticeProps = {
  customerUuid: string;
  onNavigate?: () => void;
};

export function OhRiskProfileRequiredNotice({
  customerUuid,
  onNavigate,
}: OhRiskProfileRequiredNoticeProps) {
  return (
    <div
      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
      data-testid="oh-risk-profile-required"
    >
      <p className="text-sm font-medium text-amber-950">Risk profile required</p>
      <p className="mt-1 text-sm leading-relaxed text-amber-900">
        {OH_RISK_PROFILE_REQUIRED_MESSAGE}
      </p>
      <Link
        href={ROUTES.customerDetailTab(customerUuid, "employment")}
        onClick={onNavigate}
        className="mt-2 inline-flex text-sm font-medium text-brand-primary hover:underline"
      >
        Set up risk profile
      </Link>
    </div>
  );
}
