"use client";

import { useState } from "react";
import { BadgeCheck } from "lucide-react";

import {
  DestructiveButton,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui/app-buttons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  OhPanelSection,
  OhRecordItem,
  OhRecordList,
  OhRecordsEmpty,
} from "@/features/occupational-health/components/OhEncounterColumns";
import { OhRecordLink } from "@/features/occupational-health/components/OhRecordLink";
import { OhStatusChip } from "@/features/occupational-health/components/OhStatusChip";
import {
  amendFitnessCertificate,
  withdrawFitnessCertificate,
} from "@/features/occupational-health/services/oh.service";
import type {
  FitnessAssessment,
  FitnessCertificate,
} from "@/features/occupational-health/types";
import {
  formatOhDateRange,
  isCertificateInForce,
  newestFirst,
} from "@/features/occupational-health/utils/oh-format";
import { formatFitnessOutcome } from "@/features/occupational-health/utils/oh-labels";
import { useToast } from "@/providers/toast-provider";

type OhCertificateRecordsProps = {
  assessments: FitnessAssessment[];
  certificates: FitnessCertificate[];
  onChanged: () => void;
};

export function OhCertificateRecords({
  assessments,
  certificates,
  onChanged,
}: OhCertificateRecordsProps) {
  if (certificates.length === 0) {
    return (
      <OhRecordsEmpty
        icon={BadgeCheck}
        title="No certificate yet"
        description={
          assessments.length === 0
            ? "Record a fitness assessment first, then issue a certificate."
            : "Issue the certificate on the left. HR sees the dates, not the clinical notes."
        }
        data-testid="oh-certificate-records-empty"
      />
    );
  }

  const outcomeByAssessmentId = new Map(
    assessments.map((item) => [item.id, item.outcome]),
  );

  return (
    <OhPanelSection title="Certificates" data-testid="oh-fitness-certificates">
      <OhRecordList>
        {newestFirst(certificates, (item) => item.signed_at ?? item.created_at).map(
          (item) => {
            const outcome = outcomeByAssessmentId.get(item.assessment);
            return (
              <OhRecordItem
                key={item.uuid}
                title={
                  outcome
                    ? `${formatFitnessOutcome(outcome)} · v${item.version}`
                    : `Certificate v${item.version}`
                }
                badges={<OhStatusChip value={item.status} />}
                meta={formatOhDateRange(item.valid_from, item.valid_to)}
                action={
                  <div className="flex items-center gap-1.5">
                    <OhRecordLink kind="certificate" uuid={item.uuid}>
                      PDF &amp; history
                    </OhRecordLink>
                    {isCertificateInForce(item) ? (
                      <>
                        <AmendCertificateAction certificate={item} onAmended={onChanged} />
                        <WithdrawCertificateAction
                          certificateUuid={item.uuid}
                          onWithdrawn={onChanged}
                        />
                      </>
                    ) : null}
                  </div>
                }
              />
            );
          },
        )}
      </OhRecordList>
    </OhPanelSection>
  );
}

function restrictionsOf(certificate: FitnessCertificate): string[] {
  const value = certificate.payload?.restrictions;
  return Array.isArray(value) ? value.filter((line): line is string => typeof line === "string") : [];
}

type AmendCertificateActionProps = {
  certificate: FitnessCertificate;
  onAmended: () => void;
};

/** Issues the next version of a certificate in force; the server signs it and supersedes this one. */
function AmendCertificateAction({ certificate, onAmended }: AmendCertificateActionProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [validTo, setValidTo] = useState(certificate.valid_to ?? "");
  const [restrictions, setRestrictions] = useState(restrictionsOf(certificate).join("\n"));
  const [isSaving, setIsSaving] = useState(false);
  const trimmedReason = reason.trim();
  const datesValid = !validTo || validTo >= certificate.valid_from;

  async function handleAmend() {
    if (trimmedReason.length < 3 || !datesValid) {
      return;
    }
    setIsSaving(true);
    try {
      await amendFitnessCertificate(certificate.uuid, {
        reason: trimmedReason,
        valid_to: validTo || null,
        payload: {
          restrictions: restrictions
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        },
      });
      toast({ variant: "success", title: `Certificate amended to v${certificate.version + 1}` });
      setOpen(false);
      setReason("");
      onAmended();
    } catch (error) {
      toast({
        title: "Could not amend certificate",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <SecondaryButton
        type="button"
        size="sm"
        className="h-7 px-2.5 text-xs"
        onClick={() => setOpen(true)}
      >
        Amend
      </SecondaryButton>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Amend certificate v{certificate.version}</DialogTitle>
            <DialogDescription>
              A new version is signed in your name and this one is marked superseded.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`oh-amend-valid-to-${certificate.uuid}`}>Valid to</Label>
              <Input
                id={`oh-amend-valid-to-${certificate.uuid}`}
                type="date"
                value={validTo}
                min={certificate.valid_from}
                onChange={(event) => setValidTo(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`oh-amend-restrictions-${certificate.uuid}`}>
                Restrictions, one per line
              </Label>
              <Textarea
                id={`oh-amend-restrictions-${certificate.uuid}`}
                rows={3}
                value={restrictions}
                onChange={(event) => setRestrictions(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`oh-amend-reason-${certificate.uuid}`}>Reason for amending</Label>
              <Input
                id={`oh-amend-reason-${certificate.uuid}`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <SecondaryButton type="button" onClick={() => setOpen(false)} disabled={isSaving}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              type="button"
              disabled={isSaving || trimmedReason.length < 3 || !datesValid}
              onClick={() => void handleAmend()}
            >
              {isSaving ? "Saving…" : "Save amendment"}
            </PrimaryButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

type WithdrawCertificateActionProps = {
  certificateUuid: string;
  onWithdrawn: () => void;
};

/** Two-step inline confirm with a required reason: withdrawing removes the certificate from the HR view. */
function WithdrawCertificateAction({
  certificateUuid,
  onWithdrawn,
}: WithdrawCertificateActionProps) {
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [reason, setReason] = useState("");
  const trimmedReason = reason.trim();

  async function handleWithdraw() {
    if (trimmedReason.length < 3) {
      toast({ title: "Add a reason for withdrawing", variant: "error" });
      return;
    }
    setIsWithdrawing(true);
    try {
      await withdrawFitnessCertificate(certificateUuid, trimmedReason);
      toast({ variant: "success", title: "Certificate withdrawn" });
      onWithdrawn();
    } catch (error) {
      toast({
        title: "Could not withdraw certificate",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setIsWithdrawing(false);
      setIsConfirming(false);
      setReason("");
    }
  }

  if (!isConfirming) {
    return (
      <SecondaryButton
        type="button"
        size="sm"
        className="h-7 px-2.5 text-xs"
        onClick={() => setIsConfirming(true)}
      >
        Withdraw
      </SecondaryButton>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        aria-label="Reason for withdrawing"
        placeholder="Reason"
        className="h-7 w-40 text-xs"
        value={reason}
        disabled={isWithdrawing}
        onChange={(event) => setReason(event.target.value)}
        data-testid="oh-certificate-withdraw-reason"
      />
      <SecondaryButton
        type="button"
        size="sm"
        className="h-7 px-2.5 text-xs"
        disabled={isWithdrawing}
        onClick={() => setIsConfirming(false)}
      >
        Keep
      </SecondaryButton>
      <DestructiveButton
        type="button"
        size="sm"
        className="h-7 px-2.5 text-xs"
        disabled={isWithdrawing || trimmedReason.length < 3}
        onClick={() => void handleWithdraw()}
      >
        {isWithdrawing ? "Withdrawing…" : "Confirm withdraw"}
      </DestructiveButton>
    </div>
  );
}
