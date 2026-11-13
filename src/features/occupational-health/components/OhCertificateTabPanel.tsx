"use client";

import { useState } from "react";

import { PrimaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  OhColumnMessage,
  OhFormFooter,
  OhPanelSection,
  submitOnModEnter,
} from "@/features/occupational-health/components/OhEncounterColumns";
import { OhCofDraftSuggestion } from "@/features/occupational-health/components/OhCertificateReadiness";
import { useVisitBrief } from "@/features/occupational-health/hooks/use-visit-brief";
import { createFitnessCertificate } from "@/features/occupational-health/services/oh.service";
import type { FitnessAssessment } from "@/features/occupational-health/types";
import {
  formatOhDate,
  latestFitnessAssessment,
  newestFirst,
  todayIsoDate,
} from "@/features/occupational-health/utils/oh-format";
import {
  FITNESS_OUTCOMES,
  formatFitnessOutcome,
} from "@/features/occupational-health/utils/oh-labels";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import { useUser } from "@/providers/user-provider";

type OhCertificateFormProps = {
  assessments: FitnessAssessment[];
  onCreated: () => void;
  visitUuid?: string;
  /** Draft applied from the assistant panel; changes when appliedDraftSeq increments. */
  appliedDraft?: { wording?: string; restrictions?: string[] } | null;
  appliedDraftSeq?: number;
  /** Hide inline suggestions when a neighbouring assistant already shows them. */
  hideInlineSuggestion?: boolean;
};

export function OhCertificateForm({
  assessments,
  onCreated,
  visitUuid,
  appliedDraft = null,
  appliedDraftSeq,
  hideInlineSuggestion = false,
}: OhCertificateFormProps) {
  const { userData } = useUser();
  const { toast } = useToast();
  const brief = useVisitBrief(hideInlineSuggestion ? undefined : visitUuid);
  const [pickedAssessmentId, setPickedAssessmentId] = useState("");
  const [validFrom, setValidFrom] = useState(todayIsoDate);
  const [validTo, setValidTo] = useState("");
  const [wordingOverride, setWordingOverride] = useState<string | null>(null);
  const [restrictionsOverride, setRestrictionsOverride] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fromAssistant, setFromAssistant] = useState({ wording: false, restrictions: false });
  const [appliedSeqSeen, setAppliedSeqSeen] = useState<number | undefined>(undefined);
  const wording = wordingOverride ?? "";
  const restrictionsText = restrictionsOverride ?? "";

  const latest = latestFitnessAssessment(assessments);
  const assessmentId = pickedAssessmentId || (latest ? String(latest.id) : "");
  const selectedAssessment = assessments.find(
    (item) => String(item.id) === assessmentId,
  );

  if (appliedDraftSeq != null && appliedDraftSeq !== appliedSeqSeen && appliedDraft) {
    setAppliedSeqSeen(appliedDraftSeq);
    if (appliedDraft.wording != null) {
      setWordingOverride(appliedDraft.wording);
    }
    if (appliedDraft.restrictions != null) {
      setRestrictionsOverride(appliedDraft.restrictions.join("\n"));
    }
    setFromAssistant({
      wording: appliedDraft.wording != null,
      restrictions: appliedDraft.restrictions != null,
    });
  }

  if (!latest) {
    return (
      <OhPanelSection>
        <OhColumnMessage data-testid="oh-certificate-locked">
          Record a fitness assessment before issuing a certificate.
        </OhColumnMessage>
      </OhPanelSection>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedAssessment || !userData?.id) {
      toast({ title: "Select an assessment to certify", variant: "error" });
      return;
    }
    if (validTo && validTo < validFrom) {
      toast({
        title: "Check the validity dates",
        description: "Valid to must be on or after valid from.",
        variant: "error",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await createFitnessCertificate({
        // Signer, signing time, status and version are set by the server from the session.
        assessment: selectedAssessment.id,
        valid_from: validFrom,
        valid_to: validTo || null,
        payload: {
          outcome: selectedAssessment.outcome,
          restrictions: restrictionsText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          wording: wording.trim() || undefined,
        },
      });
      setValidTo("");
      setWordingOverride("");
      setRestrictionsOverride("");
      setFromAssistant({ wording: false, restrictions: false });
      toast({ variant: "success", title: "Fitness certificate issued" });
      onCreated();
    } catch (error) {
      toast({
        title: "Could not issue certificate",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const draftWording = brief.data?.draft.wording?.trim() ?? "";
  const draftRestrictions = (brief.data?.draft.restrictions ?? []).filter((line) => line.trim() !== "");
  const showInline =
    !hideInlineSuggestion && Boolean(visitUuid) && (Boolean(draftWording) || draftRestrictions.length > 0 || brief.isLoading);

  return (
    <OhPanelSection
      title="Issue certificate"
      description="Issued certificates are visible to HR without clinical detail."
      data-testid="oh-fitness-certificate-form"
    >
      <form
        onSubmit={(event) => void handleSubmit(event)}
        onKeyDown={submitOnModEnter}
        className="flex flex-col"
      >
        {showInline ? (
          <OhCofDraftSuggestion
            wording={draftWording}
            restrictions={draftRestrictions}
            loading={brief.isLoading}
            className="mb-5 border-b-0 px-0"
            onAccept={(draft) => {
              if (draft.wording != null) {
                setWordingOverride(draft.wording);
                setFromAssistant((current) => ({ ...current, wording: true }));
              }
              if (draft.restrictions != null) {
                setRestrictionsOverride(draft.restrictions.join("\n"));
                setFromAssistant((current) => ({ ...current, restrictions: true }));
              }
            }}
          />
        ) : null}

        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-medium text-brand-slate">Outcome</p>
            <div
              role="group"
              aria-label="Assessment outcome"
              data-testid="oh-cert-outcome"
              className="grid grid-cols-1 gap-1.5 sm:grid-cols-3"
            >
              {FITNESS_OUTCOMES.map((option) => {
                const selected = selectedAssessment?.outcome === option.value;
                return (
                  <span
                    key={option.value}
                    data-selected={selected || undefined}
                    className={cn(
                      "rounded-md border px-3 py-2.5 text-center text-[13px] font-medium",
                      selected
                        ? "border-brand-primary bg-brand-primary text-white"
                        : "border-dash-border/80 bg-white text-dash-muted",
                    )}
                  >
                    {option.label}
                  </span>
                );
              })}
            </div>
            <p className="text-[12px] text-dash-muted">
              Taken from the selected assessment
              {selectedAssessment?.assessed_at
                ? ` on ${formatOhDate(selectedAssessment.assessed_at)}`
                : ""}
              . Choose a different assessment to change it.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="oh-cert-assessment">
                Assessment <RequiredFieldMarker />
              </Label>
              <Select value={assessmentId} onValueChange={setPickedAssessmentId}>
                <SelectTrigger id="oh-cert-assessment" className="w-full">
                  <SelectValue placeholder="Assessment" />
                </SelectTrigger>
                <SelectContent className={appFont.className}>
                  {newestFirst(assessments, (item) => item.assessed_at).map((item) => (
                    <SelectItem key={item.uuid} value={String(item.id)}>
                      {formatFitnessOutcome(item.outcome)} ·{" "}
                      {formatOhDate(item.assessed_at)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oh-cert-valid-from">
                Valid from <RequiredFieldMarker />
              </Label>
              <Input
                id="oh-cert-valid-from"
                type="date"
                value={validFrom}
                onChange={(event) => setValidFrom(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-dash-border pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
              Restrictions and review
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="oh-cert-restrictions">Restrictions, one per line</Label>
                {fromAssistant.restrictions ? (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-violet-800">
                    Suggested
                  </span>
                ) : null}
              </div>
              <Textarea
                id="oh-cert-restrictions"
                rows={3}
                value={restrictionsText}
                onChange={(event) => {
                  setRestrictionsOverride(event.target.value);
                  setFromAssistant((current) => ({ ...current, restrictions: false }));
                }}
                placeholder="No night shift"
                className={cn(fromAssistant.restrictions && "border-violet-300 bg-violet-50/40")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oh-cert-valid-to">Review date</Label>
              <Input
                id="oh-cert-valid-to"
                type="date"
                min={validFrom}
                value={validTo}
                onChange={(event) => setValidTo(event.target.value)}
              />
              <p className="text-[12px] text-dash-muted">When this certificate should be reviewed (valid to).</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label htmlFor="oh-cert-wording">Certificate wording</Label>
              {fromAssistant.wording ? (
                <span className="text-[10px] font-medium uppercase tracking-wide text-violet-800">
                  Suggested
                </span>
              ) : null}
            </div>
            <Textarea
              id="oh-cert-wording"
              rows={3}
              value={wording}
              onChange={(event) => {
                setWordingOverride(event.target.value);
                setFromAssistant((current) => ({ ...current, wording: false }));
              }}
              className={cn(fromAssistant.wording && "border-violet-300 bg-violet-50/40")}
            />
          </div>
        </div>

        <OhFormFooter>
          <PrimaryButton type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Issuing…" : "Issue certificate"}
          </PrimaryButton>
        </OhFormFooter>
      </form>
    </OhPanelSection>
  );
}
