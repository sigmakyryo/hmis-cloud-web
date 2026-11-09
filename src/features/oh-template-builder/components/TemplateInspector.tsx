"use client";

import { Archive } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { PrimaryButton } from "@/components/ui/app-buttons";
import { ConfirmActionButton } from "@/features/oh-template-builder/components/ConfirmActionButton";
import { FormBillingFields } from "@/features/oh-template-builder/components/BillingFields";
import { SelectionIllustration } from "@/features/oh-template-builder/components/UndrawIllustrations";
import { ItemInspector } from "@/features/oh-template-builder/components/ItemInspector";
import { SectionInspector } from "@/features/oh-template-builder/components/SectionInspector";
import {
  useSectionItems,
  useTemplateBuilder,
} from "@/features/oh-template-builder/hooks/useTemplateBuilder";
import { templateGalleryHref } from "@/features/oh-template-builder/lib/templateKinds";

export function TemplateInspector() {
  const { selection, attachments } = useTemplateBuilder();
  const attachment =
    selection.type === "template"
      ? undefined
      : attachments.find((row) => row.uuid === selection.attachmentUuid);
  const itemsQuery = useSectionItems(
    selection.type === "item" ? attachment?.sectionUuid : null,
  );

  if (!attachment || selection.type === "template") {
    return <TemplateDetailsPanel />;
  }

  if (selection.type === "section") {
    if (!attachment.section) {
      return <InspectorPending label="Opening this section" />;
    }
    return (
      <SectionInspector
        key={attachment.uuid}
        attachment={attachment}
        section={attachment.section}
      />
    );
  }

  if (itemsQuery.isPending || !attachment.section) {
    return <InspectorPending label="Opening this item" />;
  }

  const item = itemsQuery.data?.items.find((row) => row.uuid === selection.itemUuid);
  if (!item) {
    return <InspectorPending label="This item is no longer on the section." />;
  }
  return <ItemInspector key={item.uuid} attachment={attachment} item={item} />;
}

function InspectorPending({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center px-5">
      <p className="text-sm text-dash-muted">{label}</p>
    </div>
  );
}

function TemplateDetailsPanel() {
  const router = useRouter();
  const { kind, template, archiveTemplate, updateTemplateBilling, isPending } =
    useTemplateBuilder();
  const [draft, setDraft] = useState<{
    billable: boolean;
    productUuid: string | null;
  } | null>(null);
  const billing = draft ?? template?.billing ?? { billable: false, productUuid: null };
  const dirty = draft !== null;
  const saving = isPending("template:billing");

  const onBillingChange = useCallback((next: typeof billing) => {
    setDraft(next);
  }, []);

  async function onSaveBilling() {
    const ok = await updateTemplateBilling(billing);
    if (ok) setDraft(null);
  }

  async function onArchive() {
    const archived = await archiveTemplate();
    if (archived) {
      router.push(templateGalleryHref(kind));
    }
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col bg-white">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <div>
          <p className="text-sm font-semibold text-brand-navy">Form settings</p>
          <p className="mt-1 text-[13px] leading-5 text-dash-muted">
            Choose a section or item to edit it, or set whether this whole form is charged.
          </p>
        </div>
        <FormBillingFields value={billing} onChange={onBillingChange} />
        {!template ? (
          <div className="flex flex-col items-center justify-center px-3 py-8 text-center">
            <SelectionIllustration className="h-16 w-auto text-brand-primary" />
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-dash-border px-3 py-2">
        <ConfirmActionButton
          confirmLabel="Archive template"
          disabled={isPending("template:archive")}
          onConfirm={onArchive}
        >
          <Archive className="size-3.5" aria-hidden />
          Archive template
        </ConfirmActionButton>
        <PrimaryButton
          type="button"
          size="sm"
          disabled={!dirty || saving}
          onClick={() => void onSaveBilling()}
        >
          {saving ? "Saving" : "Save"}
        </PrimaryButton>
      </div>
    </div>
  );
}
