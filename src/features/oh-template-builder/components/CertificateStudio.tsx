"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Loader2, Plus, Search, Send, SlidersHorizontal, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { PrimaryButton } from "@/components/ui/app-buttons";
import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { AddSectionSheet } from "@/features/oh-template-builder/components/AddSectionSheet";
import { CertificateEditorCanvas } from "@/features/oh-template-builder/components/CertificateEditorCanvas";
import { TemplateInspector } from "@/features/oh-template-builder/components/TemplateInspector";
import { TemplatePreview } from "@/features/oh-template-builder/components/TemplatePreview";
import type { BuilderMode } from "@/features/oh-template-builder/components/TemplateBuilderTopBar";
import {
  useSectionItems,
  useTemplateBuilder,
} from "@/features/oh-template-builder/hooks/useTemplateBuilder";
import {
  extractAssistantMessage,
  extractOperations,
  parseSseChunk,
  toolActivityLabel,
} from "@/features/oh-template-builder/lib/parseAiStream";
import {
  templateGalleryHref,
  templateQueryKeys,
} from "@/features/oh-template-builder/lib/templateKinds";
import { useTemplateAiQueue } from "@/features/oh-template-builder/hooks/useTemplateAiQueue";
import { defaultResponseFields } from "@/features/settings/components/modules/occupational-health/template-library/responseConfig";
import type { BuilderAttachment } from "@/features/oh-template-builder/template-builder.types";
import { scrollToCertificateSection } from "@/features/oh-template-builder/lib/certificateEditorScroll";
import { CERTIFICATE_CONTENT_GUTTERS, CERTIFICATE_CONTENT_WIDTH } from "@/features/oh-template-builder/lib/certificateStudioLayout";
import { appFont } from "@/lib/fonts";
import { getErrorMessage } from "@/lib/fetch-error";
import { cn } from "@/lib/utils";

// The outline/header share a track; configuration grows independently into spare space.
// Explicit min/max bounds override flex items' content-based automatic minima.
const SIDEBAR_SIZE = "box-border min-w-0 w-full shrink-0 md:w-[var(--certificate-sidebar-width)] md:min-w-[var(--certificate-sidebar-width)] md:max-w-[var(--certificate-sidebar-width)] md:basis-[var(--certificate-sidebar-width)]";

type CertificateStudioProps = {
  view: BuilderMode;
};

export function CertificateStudio({ view }: CertificateStudioProps) {
  const {
    template,
    templateUuid,
    attachments,
    selection,
    select,
    isLoading,
    createSection,
    publishTemplate,
    flushPendingSaves,
    isPending,
    isBusy,
  } = useTemplateBuilder();
  const { enqueue, whenIdle, note, setNote: writeNote } = useTemplateAiQueue(templateUuid);
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [prompt, setPrompt] = useState("");
  const [sectionSearchOpen, setSectionSearchOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [activity, setActivity] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const conversationId = useRef<string | null>(null);
  const streamAbort = useRef<AbortController | null>(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      streamAbort.current?.abort();
    };
  }, []);
  const pathname = usePathname();
  const router = useRouter();
  const [isSwitchingView, startViewChange] = useTransition();
  const previewing = view === "preview";
  const selectedAttachment =
    selection.type === "template"
      ? undefined
      : attachments.find((row) => row.uuid === selection.attachmentUuid);
  const publishing = isPending("template:publish");

  async function send(text: string) {
    const controller = new AbortController();
    streamAbort.current = controller;
    const known = new Set(attachments.map((row) => row.uuid));
    setStreaming(true);
    setReply("");
    setActivity("Writing");
    const seen = new Set<string>();
    let raw = "";
    let buffer = "";
    try {
      const response = await fetch(
        BFF_OCCUPATIONAL_HEALTH_ROUTES.cofTemplateAiStream(templateUuid),
        {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            prompt: text,
            conversation_id: conversationId.current ?? undefined,
          }),
        },
      );
      if (!response.ok || !response.body) {
        throw new Error("The assistant could not start.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const chunk = await reader.read();
        if (!active.current || chunk.done) {
          break;
        }
        buffer += decoder.decode(chunk.value, { stream: true });
        const parsed = parseSseChunk(buffer);
        buffer = parsed.rest;
        for (const event of parsed.events) {
          if (event.type === "text_delta" && event.delta) {
            raw += event.delta;
            setReply(extractAssistantMessage(raw));
            setActivity(null);
            for (const operation of extractOperations(raw)) {
              const signature = `${operation.type}:${operation.section_code ?? ""}:${operation.code ?? operation.name ?? ""}`;
              if (seen.has(signature)) {
                continue;
              }
              seen.add(signature);
              enqueue(operation);
            }
          }
          if (event.type === "tool_call") {
            setActivity(toolActivityLabel(event.tool_name));
          }
          if (event.type === "conversation" && event.conversation_id) {
            conversationId.current = event.conversation_id;
          }
        }
      }
      await whenIdle();
      if (!active.current) return;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: templateQueryKeys.attachments("certificate", templateUuid),
        }),
        queryClient.invalidateQueries({
          queryKey: templateQueryKeys.library("certificate"),
        }),
        queryClient.invalidateQueries({
          queryKey: ["oh-templates", "certificate", "items"],
        }),
      ]);
      const rows = queryClient.getQueryData<typeof attachments>(
        templateQueryKeys.attachments("certificate", templateUuid),
      );
      const created = rows?.find((row) => !known.has(row.uuid));
      if (active.current && created) {
        select({ type: "section", attachmentUuid: created.uuid });
      }
    } catch (error) {
      if (active.current && !controller.signal.aborted) writeNote(getErrorMessage(error, "The draft could not be written."));
    } finally {
      if (active.current) {
        setStreaming(false);
        setActivity(null);
      }
    }
  }

  async function addSection() {
    const count = attachments.length + 1;
    await createSection({
      name: "New section",
      code: `SECTION_${count}`,
      isMandatory: false,
      selectionMode: "inclusive",
      contentMode: "items",
      defaultResponseFields: defaultResponseFields("text"),
    });
  }

  function openView(next: BuilderMode) {
    if (next === view || isSwitchingView || isBusy) {
      return;
    }
    const href = next === "preview" ? `${pathname}?view=preview` : pathname;
    startViewChange(() => {
      void (async () => {
        if (!(await flushPendingSaves())) return;
        router.replace(href, { scroll: false });
      })();
    });
  }

  // 51rem bounds the middle to its 48rem document plus 3rem responsive gutters.
  // The right column, rather than empty document margins, absorbs any remaining width.
  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-y-auto bg-[#fafaf9] [--certificate-sidebar-width:14rem] xl:[--certificate-sidebar-width:16rem] [--certificate-document-column:51rem] [--certificate-config-width:16rem] lg:[--certificate-config-width:20rem] xl:[--certificate-config-width:22rem] md:flex-row md:overflow-hidden", appFont.className)}>
      <div aria-label="Certificate workspace" className="flex min-h-0 min-w-0 flex-1 flex-col bg-inherit md:basis-[calc(var(--certificate-sidebar-width)+var(--certificate-document-column))] md:max-w-[calc(var(--certificate-sidebar-width)+var(--certificate-document-column))]">
      <header aria-label="Certificate editor header" className="grid shrink-0 items-center gap-y-2 py-2 md:grid-cols-[var(--certificate-sidebar-width)_minmax(0,1fr)]">
          <div className="flex min-w-0 items-center justify-between gap-2 px-3">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <Link
                href={templateGalleryHref("certificate")}
                aria-label="Back to certificate catalog"
                title="Back to certificate catalog"
                className="grid size-6 shrink-0 place-items-center rounded-full text-dash-muted hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
              >
                <ArrowLeft className="size-3.5" aria-hidden />
              </Link>
              <h1 title={template?.name || "Untitled certificate"} className="min-w-0 truncate text-sm font-semibold tracking-tight text-brand-navy">
                {isLoading ? "Opening" : template?.name || "Untitled certificate"}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                aria-label="Search section library"
                title="Search section library"
                aria-haspopup="dialog"
                aria-expanded={sectionSearchOpen}
                disabled={isLoading || isBusy || streaming}
                onClick={() => setSectionSearchOpen(true)}
                className="grid size-7 place-items-center rounded-full bg-white text-brand-navy shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 disabled:opacity-40"
              ><Search className="size-3.5" aria-hidden /></button>
              <button
                type="button"
                aria-label="Add section"
                title="Add section"
                disabled={isLoading || isBusy || streaming || isPending("section:create")}
                onClick={() => void addSection()}
                className="grid size-7 place-items-center rounded-full bg-brand-primary text-white hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:ring-offset-2 disabled:opacity-40"
              ><Plus className="size-3.5" aria-hidden /></button>
            </div>
          </div>
          <div className={cn("min-w-0 overflow-y-auto [scrollbar-gutter:stable]", CERTIFICATE_CONTENT_GUTTERS)}>
            <div data-certificate-header-content className={cn(CERTIFICATE_CONTENT_WIDTH, "grid grid-cols-1 items-center gap-y-1 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]")}>
              <div className="flex justify-center xl:col-start-2">
                <div aria-label="Editor view" className="flex h-8 items-center rounded-md bg-brand-tint p-0.5">
                  <ViewChip
                    active={!previewing}
                    disabled={isSwitchingView || isBusy || streaming}
                    onClick={() => openView("edit")}
                  >
                    Build
                  </ViewChip>
                  <ViewChip
                    active={previewing}
                    disabled={isSwitchingView || isBusy || streaming}
                    onClick={() => openView("preview")}
                  >
                    Preview
                  </ViewChip>
                </div>
              </div>
              <div aria-label="Certificate publishing actions" className="justify-self-end xl:col-start-3">
                <PrimaryButton

                  type="button"
                  size="sm"
                  disabled={publishing || isLoading || isBusy || streaming}
                  onClick={() => {
                    void (async () => {
                      if (await flushPendingSaves()) await publishTemplate();
                    })();
                  }}

                >
                  {publishing ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  {publishing ? "Publishing" : "Publish"}
                </PrimaryButton>
              </div>
            </div>
          </div>
      </header>
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside aria-label="Certificate section outline" className={cn(SIDEBAR_SIZE, "flex max-h-48 flex-col overflow-hidden bg-inherit md:max-h-none")}>
        <nav
          aria-label="Certificate sections"
          className="flex min-h-0 flex-1 flex-col px-2 py-3"
        >
          <div className="mb-2 flex items-center justify-between px-2"><h2 className="text-[11px] font-semibold tracking-widest text-dash-muted uppercase">Document outline</h2><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-dash-muted">{attachments.length}</span></div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-2">
            {isLoading ? (
              <p className="px-2 text-sm text-dash-muted" aria-busy="true">
                Opening sections
              </p>
            ) : attachments.length === 0 ? (
              <p className="px-2 text-sm leading-5 text-dash-muted">No sections yet.</p>
            ) : (
              <ol className="space-y-1">
                {attachments.map((attachment) => (
                  <SectionThread
                    key={attachment.uuid}
                    attachment={attachment}
                    open={expanded[attachment.uuid] ?? attachment.uuid === selectedAttachment?.uuid}
                    selected={
                      selection.type !== "template" &&
                      selection.attachmentUuid === attachment.uuid
                    }
                    selectedItemUuid={
                      selection.type === "item" && selection.attachmentUuid === attachment.uuid
                        ? selection.itemUuid
                        : null
                    }
                    onToggle={() =>
                      setExpanded((current) => ({
                        ...current,
                        [attachment.uuid]: !(
                          current[attachment.uuid] ?? attachment.uuid === selectedAttachment?.uuid
                        ),
                      }))
                    }
                    onSelectSection={() => {
                      setExpanded((current) => ({ ...current, [attachment.uuid]: true }));
                      select({ type: "section", attachmentUuid: attachment.uuid });
                      if (!previewing) scrollToCertificateSection(attachment.uuid);
                    }}
                    onSelectItem={(itemUuid) => {
                      select({
                        type: "item",
                        attachmentUuid: attachment.uuid,
                        itemUuid,
                      });
                      if (!previewing) scrollToCertificateSection(attachment.uuid);
                    }}
                  />
                ))}
              </ol>
            )}
          </div>
        </nav>
      </aside>
      <section className="flex min-h-[32rem] min-w-0 flex-1 flex-col md:min-h-0">

        {previewing ? (
          <div className="min-h-0 flex-1">
            <TemplatePreview embedded className="bg-transparent" />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <CertificateEditorCanvas onAddSection={() => void addSection()} />
            {reply || activity || note ? <div
              className="mx-5 mb-3 max-h-28 shrink-0 overflow-y-auto bg-transparent px-3 py-2 text-sm lg:mx-8"
              aria-live="polite"
            >
              {reply || activity ? <><p className="mb-1 flex items-center gap-2 text-xs font-medium text-brand-primary"><Sparkles className="size-3.5" aria-hidden />{activity ?? "Assistant"}</p><p className="whitespace-pre-wrap leading-6 text-brand-navy">{reply}</p></> : null}
              {note ? <p className="text-red-700" role="alert">{note}</p> : null}
            </div> : null}
          </div>
        )}

        {previewing ? null : (
          <form

            className={cn("shrink-0 overflow-y-auto bg-transparent [scrollbar-gutter:stable] py-2", CERTIFICATE_CONTENT_GUTTERS)}

            onSubmit={(event) => {
              event.preventDefault();
              const text = prompt.trim();
              if (!text || streaming || isLoading) {
                return;
              }
              setPrompt("");
              void send(text);
            }}

          >
            <div data-certificate-composer-content className={CERTIFICATE_CONTENT_WIDTH}>
              <div
                className="flex items-end gap-3 rounded-md bg-white/70 px-3 py-1.5 shadow-[0_2px_10px_rgb(31_42_36/0.08)] focus-within:ring-2 focus-within:ring-brand-primary/10"
              >
                <textarea
                  aria-label="Describe changes for the certificate assistant"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows={1}
                  disabled={isLoading}
                  placeholder="Write the next section, item, or field"
                  className="min-h-8 flex-1 resize-none bg-transparent py-1 text-sm text-brand-navy outline-none placeholder:text-dash-muted disabled:opacity-60"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={streaming || isLoading || !prompt.trim()}
                  className="mb-1 grid size-8 place-items-center rounded-full bg-brand-primary text-white hover:bg-brand-primary-hover disabled:opacity-30"
                  aria-label="Send"
                >
                  {streaming ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </section>
        </div>
      </div>
      {/* Cap the document column; configuration receives remaining lateral space. */}
      <aside
        aria-label="Certificate editor sidebar"
        className="box-border my-3 mr-3 flex min-h-0 min-w-0 max-h-[36dvh] shrink-0 flex-col overflow-hidden rounded-lg border-y border-r border-dash-border bg-white shadow-[0_1px_6px_rgb(31_42_36/0.06)] md:w-[var(--certificate-config-width)] md:min-w-[var(--certificate-config-width)] md:max-h-none md:grow md:basis-[var(--certificate-config-width)]"
      >
        {!previewing ? <>
          <div className="flex items-center justify-between gap-2 border-b border-dash-border bg-white px-3 py-3">
            <h2 className="flex items-center gap-2 text-xs font-semibold text-brand-navy"><SlidersHorizontal className="size-3.5" aria-hidden />{selection.type === "item" ? "Item settings" : selection.type === "section" ? "Section settings" : "Template settings"}</h2>
            {selection.type !== "template" ? <button
              type="button"
              onClick={() => select({ type: "template" })}
              className="rounded px-1 text-xs text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
            >Deselect</button> : null}
          </div>
          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto"><TemplateInspector /></div>
        </> : <p className="px-5 py-4 text-xs leading-5 text-dash-muted">Preview the complete certificate. Return to Build to edit its sections and fields.</p>}
      </aside>
      {sectionSearchOpen ? <AddSectionSheet open initialTab="library" onOpenChange={setSectionSearchOpen} /> : null}
    </div>
  );
}

function ViewChip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button

      type="button"

      disabled={disabled}

      aria-current={active ? "page" : undefined}

      onClick={onClick}

      className={cn(
        "h-7 rounded-md px-3 text-sm disabled:opacity-60",
        active ? "bg-white font-medium text-brand-navy" : "text-dash-muted hover:text-brand-navy",
      )}

    >
      {children}
    </button>
  );
}

function SectionThread({
  attachment,
  open,
  selected,
  selectedItemUuid,
  onToggle,
  onSelectSection,
  onSelectItem,
}: {
  attachment: BuilderAttachment;
  open: boolean;
  selected: boolean;
  selectedItemUuid: string | null;
  onToggle: () => void;
  onSelectSection: () => void;
  onSelectItem: (itemUuid: string) => void;
}) {
  const itemsQuery = useSectionItems(open ? attachment.sectionUuid : null);
  const name = attachment.section?.name ?? "Untitled section";
  const items = itemsQuery.data?.items ?? [];

  return (
    <li>
      <div className="flex items-center gap-0.5">
        <button

          type="button"

          aria-expanded={open}

          aria-label={open ? `Collapse ${name}` : `Expand ${name}`}

          onClick={onToggle}

          className="grid size-6 shrink-0 place-items-center rounded-md text-dash-muted hover:bg-brand-tint/50 hover:text-brand-navy"

        >
          <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
        </button>
        <button

          type="button"

          onClick={onSelectSection}

          aria-pressed={selected && !selectedItemUuid}

          className={cn(
            "min-w-0 flex-1 truncate rounded px-2 py-1 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30",
            selected && !selectedItemUuid
              ? "bg-slate-100 font-medium text-brand-navy"
              : "text-brand-navy hover:bg-brand-tint/50",
          )}

        >
          {name}
        </button>
      </div>
      {open ? (
        <ul className="mt-0.5 ml-3 border-l border-brand-primary/20 pl-3">
          {items.map((item) => (
            <li key={item.uuid} className="relative">
              <span
                aria-hidden
                className="absolute top-1/2 -left-3 h-px w-2.5 bg-brand-primary/25"
              />
              <button
                type="button"
                onClick={() => onSelectItem(item.uuid)}
                className={cn(
                  "block w-full truncate rounded-md px-1.5 py-1 text-left text-sm",
                  selectedItemUuid === item.uuid
                    ? "bg-brand-tint font-medium text-brand-primary"
                    : "text-dash-muted hover:bg-brand-tint/50 hover:text-brand-navy",
                )}
              >
                {item.name}
              </button>
            </li>
          ))}
          {itemsQuery.isPending ? (
            <li className="px-1.5 py-1 text-xs text-dash-muted">Loading items</li>
          ) : null}
          {!itemsQuery.isPending && items.length === 0 ? (
            <li className="px-1.5 py-1 text-xs text-dash-muted">No items</li>
          ) : null}
        </ul>
      ) : null}
    </li>
  );
}

