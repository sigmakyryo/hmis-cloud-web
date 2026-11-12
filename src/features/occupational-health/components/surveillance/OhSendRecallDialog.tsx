"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OhConfirmDialog } from "@/features/occupational-health/components/dashboard/OhConfirmDialog";
import { runSurvRecalls } from "@/features/occupational-health/services/oh-ext.service";
import { useToast } from "@/providers/toast-provider";

type OhSendRecallDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Limit to these requirements; omit to sweep everything due within the window. */
  requirementUuids?: string[];
  onSent?: () => void;
};

/** Confirm sending surveillance recalls (in-app always, plus email / SMS when chosen). */
export function OhSendRecallDialog({ open, onOpenChange, requirementUuids, onSent }: OhSendRecallDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [within, setWithin] = useState("14");
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);
  const scoped = requirementUuids !== undefined;
  const withinDays = Number(within);
  const withinValid = Number.isInteger(withinDays) && withinDays >= 0 && withinDays <= 180;

  const run = useMutation({
    mutationFn: () =>
      runSurvRecalls({
        within_days: scoped ? 180 : withinDays,
        channels: [...(email ? (["email"] as const) : []), ...(sms ? (["sms"] as const) : [])],
        ...(scoped ? { requirement_uuids: requirementUuids } : {}),
      }),
    onSuccess: (r) => {
      toast({
        variant: "success",
        title: "Recalls processed",
        description: `${r.in_app} new in-app · ${r.sent} sent · ${r.skipped} not configured · ${r.failed} failed`,
      });
      void queryClient.invalidateQueries({ queryKey: ["oh-surv-recalls"] });
      onOpenChange(false);
      onSent?.();
    },
    onError: (error) =>
      toast({ variant: "error", title: "Could not send recalls", description: error instanceof Error ? error.message : undefined }),
  });

  return (
    <OhConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={scoped ? `Send recall to ${requirementUuids.length} worker${requirementUuids.length === 1 ? "" : "s"}` : "Send surveillance recalls"}
      description={
        scoped
          ? "Each selected requirement gets an in-app recall. Workers already recalled at this stage are skipped."
          : "Creates recalls for every requirement that is overdue or due within the window. Workers already recalled at this stage are skipped."
      }
      confirmLabel="Send recalls"
      pendingLabel="Sending…"
      isPending={run.isPending}
      confirmDisabled={!scoped && !withinValid}
      onConfirm={() => run.mutate()}
      data-testid="oh-send-recall-dialog"
    >
      {!scoped ? (
        <div className="space-y-1.5">
          <Label htmlFor="oh-recall-within">Due within (days)</Label>
          <Input
            id="oh-recall-within"
            inputMode="numeric"
            className="h-9 w-28"
            value={within}
            aria-invalid={!withinValid}
            onChange={(e) => setWithin(e.target.value)}
          />
          {!withinValid ? <p className="text-[12px] text-red-700">Enter 0 to 180 days.</p> : null}
        </div>
      ) : null}
      <fieldset className="space-y-2">
        <legend className="mb-1 text-[12px] font-medium text-dash-muted">Also send by</legend>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="size-4 accent-brand-primary" checked={email} onChange={(e) => setEmail(e.target.checked)} /> Email
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="size-4 accent-brand-primary" checked={sms} onChange={(e) => setSms(e.target.checked)} /> SMS
        </label>
        <p className="text-[12px] text-dash-muted">Channels that are not set up are recorded as “not configured”.</p>
      </fieldset>
    </OhConfirmDialog>
  );
}
