"use client";

import { SecondaryButton } from "@/components/ui/app-buttons";

type OhRiskProfileInlinePromptProps = {
  onManageEmployment: () => void;
};

/** Inline prompt — does not replace the consult chrome. Exam and certificate stay gated. */
export function OhRiskProfileInlinePrompt({
  onManageEmployment,
}: OhRiskProfileInlinePromptProps) {
  return (
    <div
      role="status"
      data-testid="oh-risk-profile-prompt"
      className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50/90 px-4 py-2.5 sm:px-5"
    >
      <p className="min-w-0 text-[12.5px] text-amber-950">
        This worker needs an active employment and risk profile before the
        examination and certificate can be completed.
      </p>
      <SecondaryButton
        type="button"
        onClick={onManageEmployment}
        className="h-8 shrink-0 px-2.5 text-[12px]"
        data-testid="oh-risk-profile-add-employment"
      >
        Add employment
      </SecondaryButton>
    </div>
  );
}
