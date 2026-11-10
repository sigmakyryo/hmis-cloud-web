"use client";

import type { ReactNode } from "react";

import { SecondaryButton } from "@/components/ui/app-buttons";
import { cn } from "@/lib/utils";

export function Drawer({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
      <button type="button" className="flex-1" aria-label="Close" onClick={onClose} />
      <div
        className={cn(
          "flex h-full w-full flex-col gap-3 overflow-y-auto border-l border-dash-border bg-white p-5 shadow-xl",
          wide ? "max-w-xl" : "max-w-md",
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-brand-navy">{title}</h2>
          <SecondaryButton type="button" onClick={onClose}>
            Close
          </SecondaryButton>
        </div>
        {children}
      </div>
    </div>
  );
}
