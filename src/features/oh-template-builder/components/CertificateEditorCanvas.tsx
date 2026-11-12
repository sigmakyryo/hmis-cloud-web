"use client";

import { ArrowDown, ArrowUp, FileText, Plus, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

import { QuickAddItem } from "@/features/oh-template-builder/components/QuickAddItem";
import { PreviewFieldInput } from "@/features/oh-template-builder/components/TemplatePreview";
import { useSectionItems, useTemplateBuilder } from "@/features/oh-template-builder/hooks/useTemplateBuilder";
import type { BuilderAttachment } from "@/features/oh-template-builder/template-builder.types";
import type { OhResponseField } from "@/features/occupational-health/types";
import { scrollToCertificateSection } from "@/features/oh-template-builder/lib/certificateEditorScroll";
import { CERTIFICATE_CONTENT_GUTTERS, CERTIFICATE_CONTENT_WIDTH } from "@/features/oh-template-builder/lib/certificateStudioLayout";
import { cn } from "@/lib/utils";

/** All sections stay mounted: selection changes settings, never the document. */
export function CertificateEditorCanvas({ onAddSection }: { onAddSection: () => void }) {
  const { attachments, selection, isLoading, isBusy } = useTemplateBuilder();
  const selectedUuid = selection.type === "template" ? null : selection.attachmentUuid;

  useEffect(() => {
    if (selectedUuid) scrollToCertificateSection(selectedUuid, false);
  }, [selectedUuid, isLoading]);

  return (
    <div
      id="certificate-editor-viewport"
      className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] py-4", CERTIFICATE_CONTENT_GUTTERS)}
      aria-label="Certificate document editor"
    >
      <div data-certificate-content className={CERTIFICATE_CONTENT_WIDTH}>
          <div className="divide-y divide-dash-border">
            {isLoading ? <p role="status" className="animate-pulse py-10 text-center text-sm text-dash-muted">Opening certificate sections…</p> : attachments.length === 0 ? <div className="px-3 py-8 text-center"><FileText className="mx-auto mb-3 size-8 text-brand-primary/50" aria-hidden /><h3 className="font-semibold text-brand-navy">Your certificate starts here</h3><p className="mt-2 text-sm text-dash-muted">Add your first section or describe it to the AI assistant.</p></div> : null}
            {attachments.map((attachment, index) => <EditorSection key={attachment.uuid} attachment={attachment} index={index} total={attachments.length} />)}
            <button
              type="button"
              onClick={onAddSection}
              disabled={isLoading || isBusy}
              className="flex w-full items-center justify-center gap-2 border-t border-dash-border px-3 py-3 text-sm font-medium text-brand-primary transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 disabled:opacity-40"
            ><Plus className="size-4" aria-hidden />Add section</button>
          </div>
      </div>
    </div>
  );
}

function EditorSection({ attachment, index, total }: { attachment: BuilderAttachment; index: number; total: number }) {
  const { selection, select, moveSection, isBusy } = useTemplateBuilder();
  const itemsQuery = useSectionItems(attachment.sectionUuid);
  const section = attachment.section;
  const active = selection.type !== "template" && selection.attachmentUuid === attachment.uuid;
  const chooseSection = () => select({ type: "section", attachmentUuid: attachment.uuid });
  const items = itemsQuery.data?.items ?? [];
  const hiddenCount = Math.max(0, (itemsQuery.data?.total ?? 0) - items.length);

  return (
    <section
      id={`certificate-editor-section-${attachment.uuid}`}
      aria-label={section?.name ?? "Untitled section"}
      className={cn("scroll-mt-4 py-3", active && "[&>div:first-child]:text-brand-primary")}
    >
      <div
        className={"flex items-center gap-2 py-1"}
      >
        <span
          className="w-5 shrink-0 text-[11px] font-medium tabular-nums text-dash-muted"
        >{String(index + 1).padStart(2, "0")}</span>
        <button
          type="button"
          onClick={chooseSection}
          aria-pressed={active && selection.type === "section"}
          className="min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
        ><span className={cn("block truncate text-sm font-semibold", active ? "text-brand-primary" : "text-brand-navy")}>{section?.name ?? "Untitled section"}</span><span className="text-[11px] text-dash-muted">{section?.contentMode === "direct" ? "Form fields" : section?.selectionMode === "exclusive" ? "Choose one answer" : "Choose any answers"}{section?.isMandatory ? " · Required" : " · Optional"}</span></button>
        <button
          type="button"
          aria-label={`Move ${section?.name ?? "section"} up`}
          disabled={index === 0 || isBusy}
          onClick={() => void moveSection(attachment.uuid, "up")}
          className="rounded-md p-1.5 text-dash-muted hover:bg-white focus-visible:ring-2 focus-visible:ring-brand-primary/30 disabled:opacity-25"
        ><ArrowUp className="size-3.5" aria-hidden /></button>
        <button
          type="button"
          aria-label={`Move ${section?.name ?? "section"} down`}
          disabled={index === total - 1 || isBusy}
          onClick={() => void moveSection(attachment.uuid, "down")}
          className="rounded-md p-1.5 text-dash-muted hover:bg-white focus-visible:ring-2 focus-visible:ring-brand-primary/30 disabled:opacity-25"
        ><ArrowDown className="size-3.5" aria-hidden /></button>
        <button
          type="button"
          aria-label={`Settings for ${section?.name ?? "section"}`}
          onClick={chooseSection}
          className="rounded-md p-1.5 text-brand-primary hover:bg-white focus-visible:ring-2 focus-visible:ring-brand-primary/30"
        ><SlidersHorizontal className="size-4" aria-hidden /></button>
      </div>
      <div className="space-y-2 pt-2 pl-7">
        {section?.contentMode === "direct" ? <SampleFields fields={section.defaultResponseFields} onSelect={chooseSection} /> : <>
          {itemsQuery.isPending ? <p role="status" className="py-3 text-xs text-dash-muted">Loading form items…</p> : itemsQuery.isError ? <div role="alert" className="text-sm text-red-700">Items could not be loaded. <button type="button" className="underline" onClick={() => void itemsQuery.refetch()}>Retry</button></div> : items.length === 0 ? <p className="py-3 text-sm text-dash-muted">No items yet. Add an item below to start this section.</p> : null}
          {items.map((item) => {
            const selected = selection.type === "item" && selection.attachmentUuid === attachment.uuid && selection.itemUuid === item.uuid;
            const chooseItem = () => select({ type: "item", attachmentUuid: attachment.uuid, itemUuid: item.uuid });
            return <div key={item.uuid} className={cn("border-l-2 py-2 pl-3", selected ? "border-brand-primary" : "border-transparent")}>
              <button
                type="button"
                onClick={chooseItem}
                aria-pressed={selected}
                className="mb-1.5 flex w-full items-center gap-2 rounded text-left text-sm font-medium text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
              ><span
                  aria-hidden
                  className={cn("size-3.5 shrink-0 border border-brand-primary/40", section?.selectionMode === "exclusive" ? "rounded-full" : "rounded")}
                />{item.name}{item.isMandatory ? <span className="text-red-600" aria-label="required">*</span> : null}<SlidersHorizontal className="ml-auto size-3.5 shrink-0 text-dash-muted" aria-hidden /></button>
              <SampleFields fields={item.effectiveResponseFields} onSelect={chooseItem} />
            </div>;
          })}
          {hiddenCount > 0 ? <p className="text-xs text-dash-muted">{hiddenCount} more items are not loaded.</p> : null}
          <QuickAddItem sectionUuid={attachment.sectionUuid} attachmentUuid={attachment.uuid} />
        </>}
      </div>
    </section>
  );
}

function SampleFields({ fields, onSelect }: { fields: OhResponseField[]; onSelect: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  if (fields.length === 0) return <p className="text-xs text-dash-muted">No response fields. Configure them in settings.</p>;
  return <div className="grid gap-3 sm:grid-cols-2" onFocus={onSelect} onClick={onSelect}>
    {fields.map((field) => <PreviewFieldInput
      key={field.code}
      field={field}
      value={values[field.code] ?? ""}
      onChange={(value) => setValues((current) => ({ ...current, [field.code]: value }))}
    />)}
  </div>;
}
