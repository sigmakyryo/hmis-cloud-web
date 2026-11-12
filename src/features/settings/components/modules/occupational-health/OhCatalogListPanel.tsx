"use client";

import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Archive01Icon, PencilEdit01Icon } from "@hugeicons/core-free-icons";

import { PrimaryButton } from "@/components/ui/app-buttons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingsContentSkeleton } from "@/features/settings/components/SettingsContentSkeleton";
import { SettingsPanelSection } from "@/features/settings/components/SettingsPageLayout";
import { OhCatalogEmptyIllustration } from "@/features/settings/components/modules/occupational-health/oh-catalog-empty-illustrations";
import { cn } from "@/lib/utils";

type OhCatalogEmptyKind = "risk" | "department" | "role";

type OhCatalogListPanelProps = {
  title: string;
  description: string;
  addLabel: string;
  onAdd: () => void;
  isLoading?: boolean;
  error?: string | null;
  emptyTitle: string;
  emptyDescription: string;
  emptyKind?: OhCatalogEmptyKind;
  toolbar?: ReactNode;
  children: ReactNode;
  isEmpty: boolean;
  /** Compact chrome for sheets / nested workspaces. */
  embedded?: boolean;
};

export function OhCatalogListPanel({
  title,
  description,
  addLabel,
  onAdd,
  isLoading = false,
  error = null,
  emptyTitle,
  emptyDescription,
  emptyKind = "role",
  toolbar,
  children,
  isEmpty,
  embedded = false,
}: OhCatalogListPanelProps) {
  const body = (
    <>
      {toolbar ? <div className="mb-4">{toolbar}</div> : null}
      {isLoading ? (
        <SettingsContentSkeleton rows={4} showHeader={false} />
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : isEmpty ? (
        <CatalogEmptyState
          kind={emptyKind}
          title={emptyTitle}
          description={emptyDescription}
          addLabel={addLabel}
          onAdd={onAdd}
          embedded={embedded}
        />
      ) : (
        children
      )}
    </>
  );

  if (embedded) {
    return (
      <div>
        <div className="mb-1 flex items-center justify-between gap-3">
          <p className="min-w-0 text-[13px] text-dash-muted">{description}</p>
          <PrimaryButton
            type="button"
            size="sm"
            className="h-8 shrink-0 px-3 text-[13px]"
            onClick={onAdd}
          >
            {addLabel}
          </PrimaryButton>
        </div>
        {body}
      </div>
    );
  }

  return (
    <SettingsPanelSection
      title={title}
      description={description}
      action={
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          {addLabel}
        </Button>
      }
    >
      {body}
    </SettingsPanelSection>
  );
}

type OhCatalogRowProps = {
  title: string;
  meta?: string;
  color?: string | null;
  isActive?: boolean;
  archiving?: boolean;
  onEdit?: () => void;
  onArchive?: () => void;
  /** Whole-row click (e.g. open employer workspace). Hides edit/archive. */
  onSelect?: () => void;
};

function CatalogEmptyState({
  kind,
  title,
  description,
  addLabel,
  onAdd,
  embedded,
}: {
  kind: OhCatalogEmptyKind;
  title: string;
  description: string;
  addLabel: string;
  onAdd: () => void;
  embedded: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-6 text-center",
        embedded ? "py-16" : "rounded-xl border border-dashed border-dash-border/80 bg-slate-50/60 py-10",
      )}
      data-testid="oh-catalog-empty"
    >
      <OhCatalogEmptyIllustration kind={kind} />
      <p className="mt-5 text-[15px] font-semibold text-brand-navy">{title}</p>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-dash-muted">
        {description}
      </p>
      <PrimaryButton
        type="button"
        size="sm"
        className="mt-5 h-8 px-3 text-[13px]"
        onClick={onAdd}
      >
        {addLabel}
      </PrimaryButton>
    </div>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? "success" : "outline"} className="shrink-0">
      {isActive ? "Active" : "Archived"}
    </Badge>
  );
}

function CatalogColorSwatch({ color }: { color?: string | null }) {
  const value = color?.trim();
  if (!value) {
    return null;
  }
  return (
    <span
      className="mt-0.5 size-3.5 shrink-0 rounded-full border border-black/10"
      style={{ backgroundColor: value }}
      aria-hidden
    />
  );
}

/** Row chrome matching user / client-tag settings lists. */
export function OhCatalogRow({
  title,
  meta,
  color,
  isActive = true,
  archiving = false,
  onEdit,
  onArchive,
  onSelect,
}: OhCatalogRowProps) {
  if (onSelect) {
    return (
      <li>
        <button
          type="button"
          onClick={onSelect}
          className="flex w-full items-center gap-3 py-3 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
        >
          <CatalogColorSwatch color={color} />
          <div className="min-w-0 flex-1">
            <p className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[13.5px] font-medium text-brand-navy">{title}</span>
              <StatusBadge isActive={isActive} />
            </p>
            {meta ? (
              <p className="mt-0.5 truncate text-[12px] text-dash-muted">{meta}</p>
            ) : null}
          </div>
        </button>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <CatalogColorSwatch color={color} />
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[13.5px] font-medium text-brand-navy">{title}</span>
            <StatusBadge isActive={isActive} />
          </p>
          {meta ? (
            <p className="mt-0.5 truncate text-[12px] text-dash-muted">{meta}</p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {onEdit ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-primary hover:underline"
            onClick={onEdit}
          >
            <HugeiconsIcon icon={PencilEdit01Icon} size={14} strokeWidth={1.8} />
            Edit
          </button>
        ) : null}
        {onArchive ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[13px] text-dash-muted hover:text-brand-navy disabled:opacity-50"
            disabled={archiving || !isActive}
            onClick={onArchive}
          >
            <HugeiconsIcon icon={Archive01Icon} size={14} strokeWidth={1.8} />
            {archiving ? "Archiving" : "Archive"}
          </button>
        ) : null}
      </div>
    </li>
  );
}
