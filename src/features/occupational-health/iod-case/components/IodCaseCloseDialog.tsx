"use client";

import { useState } from "react";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { IodCaseDetail } from "@/features/occupational-health/iod-case/iod-case.types";
import { appFont } from "@/lib/fonts";

type IodCaseCloseDialogProps = {
  item: IodCaseDetail;
  open: boolean;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (changes: Record<string, unknown>) => void;
};

/** Closing is a deliberate step: record how it ended and the final lost days. */
export function IodCaseCloseDialog({ item, open, isSaving, onOpenChange, onConfirm }: IodCaseCloseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={appFont.className}>
        {open ? <CloseForm item={item} isSaving={isSaving} onCancel={() => onOpenChange(false)} onConfirm={onConfirm} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function CloseForm({
  item,
  isSaving,
  onCancel,
  onConfirm,
}: {
  item: IodCaseDetail;
  isSaving: boolean;
  onCancel: () => void;
  onConfirm: (changes: Record<string, unknown>) => void;
}) {
  const [summary, setSummary] = useState(item.closure_summary);
  const [lostDays, setLostDays] = useState(String(item.lost_days));
  const [returnDate, setReturnDate] = useState(item.return_to_work_on ?? "");
  const lost = Number.parseInt(lostDays, 10);
  const lostValid = Number.isInteger(lost) && lost >= 0 && lost <= 3650;

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!lostValid) return;
        onConfirm({
          status: "closed",
          closure_summary: summary.trim(),
          lost_days: lost,
          return_to_work_on: returnDate || null,
        });
      }}
    >
      <DialogHeader>
        <DialogTitle>Close this case</DialogTitle>
        <DialogDescription>
          Confirm the final lost days and note how the case ended. You can reopen it later if something changes.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="iod-close-lost">Total lost days</Label>
          <Input id="iod-close-lost" type="number" min={0} max={3650} value={lostDays} onChange={(e) => setLostDays(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="iod-close-rtw">Returned to work</Label>
          <Input id="iod-close-rtw" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="iod-close-summary">How the case ended</Label>
        <Textarea
          id="iod-close-summary"
          rows={4}
          maxLength={2000}
          placeholder="Outcome, final treatment, any restrictions that remain…"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>
      <DialogFooter className="gap-2 sm:gap-2">
        <SecondaryButton type="button" onClick={onCancel}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={isSaving || !lostValid}>
          {isSaving ? "Closing…" : "Close case"}
        </PrimaryButton>
      </DialogFooter>
    </form>
  );
}
