"use client";

import { useState } from "react";

import { DestructiveButton, SecondaryButton } from "@/components/ui/app-buttons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  cancelNativeOhVisit,
  type CancelNativeOhVisitPayload,
} from "@/features/occupational-health/services/native-visit.service";
import { useToast } from "@/providers/toast-provider";

type OhCancelVisitDialogProps = {
  encounterUuid: string;
  disabled?: boolean;
  onCancelled: () => void;
};

const OUTCOMES: { value: CancelNativeOhVisitPayload["outcome"]; label: string }[] = [
  { value: "cancelled", label: "Cancel visit" },
  { value: "no_show", label: "Did not attend" },
];

/** Cancels a native OH visit (or records a no-show) so the worker can be booked again. */
export function OhCancelVisitDialog({
  encounterUuid,
  disabled,
  onCancelled,
}: OhCancelVisitDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<CancelNativeOhVisitPayload["outcome"]>("cancelled");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trimmedReason = reason.trim();

  async function handleConfirm() {
    if (trimmedReason.length < 3) {
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await cancelNativeOhVisit(encounterUuid, {
        outcome,
        reason: trimmedReason,
      });
      const openLines = result.open_billing_lines ?? 0;
      toast({
        variant: "success",
        title: outcome === "no_show" ? "Visit marked did not attend" : "Visit cancelled",
        description:
          openLines > 0
            ? `${openLines} billing line${openLines === 1 ? "" : "s"} still on the bill. Ask billing to review.`
            : undefined,
      });
      setOpen(false);
      setReason("");
      onCancelled();
    } catch (error) {
      toast({
        title: "Could not cancel visit",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <SecondaryButton
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        data-testid="oh-cancel-visit"
      >
        Cancel visit
      </SecondaryButton>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this visit?</DialogTitle>
            <DialogDescription>
              The worker leaves the OHS Queue and can be booked again. Saved answers are kept.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2" role="group" aria-label="Outcome">
              {OUTCOMES.map((item) => (
                <SecondaryButton
                  key={item.value}
                  type="button"
                  size="sm"
                  aria-pressed={outcome === item.value}
                  className={outcome === item.value ? "border-brand-primary text-brand-primary" : undefined}
                  onClick={() => setOutcome(item.value)}
                >
                  {item.label}
                </SecondaryButton>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="oh-cancel-visit-reason">Reason</Label>
              <Textarea
                id="oh-cancel-visit-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={isSubmitting}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <SecondaryButton type="button" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Keep visit
            </SecondaryButton>
            <DestructiveButton
              type="button"
              disabled={isSubmitting || trimmedReason.length < 3}
              onClick={() => void handleConfirm()}
            >
              {isSubmitting ? "Cancelling…" : "Confirm"}
            </DestructiveButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
