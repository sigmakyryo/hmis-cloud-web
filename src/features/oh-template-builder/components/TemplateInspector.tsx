"use client";

import { Archive } from "lucide-react";
import { useRouter } from "next/navigation";

import { ConfirmActionButton } from "@/features/oh-template-builder/components/ConfirmActionButton";
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
  const { kind, archiveTemplate, isPending } = useTemplateBuilder();

  async function onArchive() {
    const archived = await archiveTemplate();
    if (archived) {
      router.push(templateGalleryHref(kind));
    }
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col bg-white">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-3 text-center">
        <SelectionIllustration className="h-16 w-auto text-brand-primary" />
        <p className="mt-3 text-sm font-semibold text-brand-navy">Nothing selected</p>
        <p className="mt-1.5 w-full text-[13px] leading-5 text-dash-muted">
          Choose a section or an item on the form. What you can edit opens here.
        </p>
      </div>
      <div className="border-t border-dash-border px-3 py-2">
        <ConfirmActionButton
          confirmLabel="Archive template"
          disabled={isPending("template:archive")}
          onConfirm={onArchive}
        >
          <Archive className="size-3.5" aria-hidden />
          Archive template
        </ConfirmActionButton>
      </div>
    </div>
  );
}

