"use client";

import type { ReactNode } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

/** Side sheet for every immunization create and edit form. */
export function Drawer({
  title,
  description,
  onClose,
  children,
  wide,
  open = true,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  open?: boolean;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent
        className={cn(
          "flex w-full flex-col gap-0 overflow-hidden p-0",
          wide ? "sm:max-w-xl" : "sm:max-w-md",
          appFont.className,
        )}
      >
        <SheetHeader className="border-b border-dash-border px-5 py-5 pr-12 text-left">
          <SheetTitle className="text-base text-brand-navy">{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

/** Right-aligned footer row for sheet forms. */
export function DrawerActions({ children }: { children: ReactNode }) {
  return <div className="mt-auto flex justify-end gap-2 border-t border-dash-border pt-4">{children}</div>;
}
