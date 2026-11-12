"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { appFont } from "@/lib/fonts";

type OhConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  onConfirm: () => void;
  isPending?: boolean;
  confirmDisabled?: boolean;
  tone?: "default" | "destructive";
  children?: ReactNode;
  "data-testid"?: string;
};

/** Confirmation step before an action that writes data or sends messages. */
export function OhConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel,
  onConfirm,
  isPending = false,
  confirmDisabled = false,
  tone = "default",
  children,
  "data-testid": testId,
}: OhConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => (isPending ? undefined : onOpenChange(next))}>
      <DialogContent className={`${appFont.className} max-w-md`} data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
          {description ? <DialogDescription className="text-[13px]">{description}</DialogDescription> : null}
        </DialogHeader>
        {children ? <div className="mt-4 space-y-3 text-[13px]">{children}</div> : null}
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tone === "destructive" ? "destructive" : "primary"}
            disabled={isPending || confirmDisabled}
            onClick={onConfirm}
          >
            {isPending ? (pendingLabel ?? `${confirmLabel}…`) : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
