"use client";

import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { useState, type ReactNode } from "react";

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
import { cn } from "@/lib/utils";

export type OhExportOption = {
  id: string;
  label: string;
  description?: string;
  format: "csv" | "pdf" | "print";
  run: () => void | Promise<void>;
};

const FORMAT_ICON = { csv: FileSpreadsheet, pdf: FileText, print: Printer } as const;

type OhExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: ReactNode;
  options: OhExportOption[];
  /** Period, scope or other settings shown above the formats. */
  children?: ReactNode;
};

/** Pick an export (CSV, PDF, print) with optional period / scope settings. */
export function OhExportDialog({ open, onOpenChange, title = "Export", description, options, children }: OhExportDialogProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const selected = options.find((o) => o.id === picked) ?? options[0];

  async function handleExport() {
    if (!selected) {
      return;
    }
    setBusy(true);
    try {
      await selected.run();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? undefined : onOpenChange(next))}>
      <DialogContent className={`${appFont.className} max-w-lg`} data-testid="oh-export-dialog">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
          {description ? <DialogDescription className="text-[13px]">{description}</DialogDescription> : null}
        </DialogHeader>
        {children ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{children}</div> : null}
        <fieldset className="mt-4 space-y-2">
          <legend className="mb-2 text-[12px] font-medium text-dash-muted">Format</legend>
          {options.map((option) => {
            const Icon = FORMAT_ICON[option.format];
            const active = selected?.id === option.id;
            return (
              <label
                key={option.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border border-dash-border px-3 py-2.5 transition-colors hover:bg-dash-canvas/60",
                  active && "border-brand-primary/50 bg-brand-tint/40",
                )}
              >
                <input
                  type="radio"
                  name="oh-export-format"
                  className="mt-1 accent-brand-primary"
                  checked={active}
                  onChange={() => setPicked(option.id)}
                />
                <Icon className="mt-0.5 size-4 shrink-0 text-brand-primary" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-brand-navy">{option.label}</span>
                  {option.description ? <span className="block text-[12px] text-dash-muted">{option.description}</span> : null}
                </span>
              </label>
            );
          })}
        </fieldset>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" variant="primary" className="gap-1.5" disabled={busy || !selected} onClick={() => void handleExport()}>
            <Download className="size-3.5" aria-hidden />
            {busy ? "Preparing…" : selected?.format === "print" ? "Open print view" : "Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
