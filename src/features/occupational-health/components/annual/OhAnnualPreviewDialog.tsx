"use client";

import { Download, ExternalLink, Printer } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { appFont } from "@/lib/fonts";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; pdfUrl: string; title: string };

/** Shows the server-rendered PDF (the exact file that is filed) with print and download. */
export function OhAnnualPreviewDialog({ open, onOpenChange, pdfUrl, title }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${appFont.className} flex h-[90vh] max-w-5xl flex-col gap-3`} data-testid="oh-annual-preview-dialog">
        <DialogHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0 pr-8">
          <div className="space-y-1">
            <DialogTitle className="text-base">{title}</DialogTitle>
            <DialogDescription className="text-[13px]">The PDF exactly as it will be downloaded or filed.</DialogDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                try {
                  frame.current?.contentWindow?.print();
                } catch {
                  window.open(pdfUrl, "_blank", "noopener");
                }
              }}
            >
              <Printer className="size-3.5" aria-hidden /> Print
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" aria-hidden /> Open
              </a>
            </Button>
            <Button asChild variant="primary" size="sm" className="gap-1.5">
              <a href={pdfUrl} download>
                <Download className="size-3.5" aria-hidden /> Download
              </a>
            </Button>
          </div>
        </DialogHeader>
        {open ? (
          <iframe ref={frame} title={`${title} PDF preview`} src={pdfUrl} className="min-h-0 w-full flex-1 rounded-lg border border-dash-border bg-dash-canvas" />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
