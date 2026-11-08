"use client";

import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Loader2, Plus, Search, Send, SlidersHorizontal, Sparkles, Square } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";

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
  toolActivityLabel,
} from "@/features/oh-template-builder/lib/parseAiStream";
import {
  templateGalleryHref,
  templateQueryKeys,
} from "@/features/oh-template-builder/lib/templateKinds";
import { readCertificateAiStream, validateCertificateAiDraft } from "@/features/oh-template-builder/lib/templateAiStream";
import { useTemplateAiQueue } from "@/features/oh-template-builder/hooks/useTemplateAiQueue";
import { defaultResponseFields } from "@/features/settings/components/modules/occupational-health/template-library/responseConfig";
import type { BuilderAttachment } from "@/features/oh-template-builder/template-builder.types";
import { scrollToCertificateSection } from "@/features/oh-template-builder/lib/certificateEditorScroll";
import { CERTIFICATE_CONTENT_GUTTERS, CERTIFICATE_CONTENT_WIDTH } from "@/features/oh-template-builder/lib/certificateStudioLayout";
import { resizeCertificateComposer } from "@/features/oh-template-builder/lib/resizeCertificateComposer";
import { appFont } from "@/lib/fonts";
import { getErrorMessage } from "@/lib/fetch-error";
import { cn } from "@/lib/utils";

// The outline/header share a track; configuration grows independently into spare space.
// Explicit min/max bounds override flex items' content-based automatic minima.
const SIDEBAR_SIZE = "box-border min-w-0 w-full shrink-0 md:w-[var(--certificate-sidebar-width)] md:min-w-[var(--certificate-sidebar-width)] md:max-w-[var(--certificate-sidebar-width)] md:basis-[var(--certificate-sidebar-width)]";

type PendingAiApproval = { token: string; expires_at: string; approvals: { id: string; label: string; effect: string }[] };
type AiApprovalDecision = { approval_token: string; conversation_id: string; decisions: Record<string, boolean> };

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
  const { enqueue, note, setNote: writeNote } = useTemplateAiQueue(templateUuid);
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [prompt, setPrompt] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [sectionSearchOpen, setSectionSearchOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [activity, setActivity] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [applying, setApplying] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<PendingAiApproval | null>(null);
  const [selectedDeletions, setSelectedDeletions] = useState<Record<string, boolean>>({});
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
  useLayoutEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;
    const resize = () => resizeCertificateComposer(textarea);
    resize();
    let width = textarea.clientWidth;
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      if (textarea.clientWidth !== width) {
        width = textarea.clientWidth;
        resize();
      }
    });
    observer?.observe(textarea);
    window.addEventListener("resize", resize);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [prompt, previewing]);
  const selectedAttachment =
    selection.type === "template"
      ? undefined
      : attachments.find((row) => row.uuid === selection.attachmentUuid);
  const publishing = isPending("template:publish");

  async function send(text: string, approval?: AiApprovalDecision) {
    const controller = new AbortController();
    streamAbort.current = controller;
    const known = new Set(attachments.map((row) => row.uuid));
    setStreaming(true);
    setApplying(!!approval);
    if (approval) setPendingApproval(null);
    setReply("");
    setActivity(approval ? Object.values(approval.decisions).some(Boolean) ? "Applying approved deletions" : "Rejecting deletions" : "Preparing");
    writeNote("");
    let raw = "";
    let refused = false;
    let awaiting: PendingAiApproval | null = null;
    let deletionResult: { completed: number; failed: number; rejected: number | boolean } | null = null;
    try {
      const response = await fetch(
        BFF_OCCUPATIONAL_HEALTH_ROUTES.cofTemplateAiStream(templateUuid),
        {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(approval ?? { prompt: text, conversation_id: conversationId.current ?? undefined }),
        },
      );
      if (response.ok && !approval) setActivity("Generating draft");
      for await (const event of readCertificateAiStream(response)) {
        if (!active.current) break;
        if (event.type === "text_delta" && event.delta) {
          raw += event.delta;
          setActivity("Generating draft");
        }
        if (event.type === "refusal") refused = true;
        if (event.type === "approval_required" && event.token && event.expires_at && Array.isArray(event.approvals)) {
          awaiting = { token: event.token, expires_at: event.expires_at, approvals: event.approvals };
        }
        if (event.type === "approval_result") deletionResult = { completed: event.completed ?? 0, failed: event.failed ?? 0, rejected: event.rejected ?? 0 };
        if (event.type === "tool_call") {
          setActivity(toolActivityLabel(event.tool_name));
        }
        if (event.type === "conversation" && event.conversation_id) {
          conversationId.current = event.conversation_id;
        }
      }
      if (!active.current) return;
      if (refused) {
        setActivity("Can't help with that.");
        toast.error("Can't help with that.");
        return;
      }
      if (awaiting) {
        setPendingApproval(awaiting);
        setSelectedDeletions({});
        setActivity("Approval required — no deletion has run");
        return;
      }
      if (deletionResult) {
        setActivity(deletionResult.completed ? `${deletionResult.completed} approved deletions completed${deletionResult.failed ? `; ${deletionResult.failed} failed` : ""}` : deletionResult.failed ? "Deletion failed — review a fresh proposal" : "Rejected — no deletion performed");
        if (deletionResult.completed) await Promise.all([
          queryClient.invalidateQueries({ queryKey: templateQueryKeys.attachments("certificate", templateUuid) }),
          queryClient.invalidateQueries({ queryKey: ["oh-templates", "certificate", "items"] }),
        ]);
        return;
      }
      const draft = validateCertificateAiDraft(raw);
      if (draft.refused) {
        setActivity("Can't help with that.");
        toast.error("Can't help with that.");
        return;
      }
      if (approval) throw new Error("The server did not confirm the approved deletion outcome. Review before retrying.");
      if (controller.signal.aborted) throw new DOMException("Cancelled", "AbortError");
      setApplying(true);
      setActivity(draft.operations.length ? `Applying ${draft.operations.length} changes` : "Checking draft");
      // A validated draft is sent once, in dependency order, instead of one HTTP request per item.
      const result = draft.operations.length ? await enqueue(draft.operations) : { applied: [], errors: [], uncertain: false };
      if (!active.current || !result) return;
      const saved = result.applied.filter((row) => !row.reused).length;
      const reused = result.applied.length - saved;
      if (result.errors.length) {
        setReply("");
        setActivity(result.uncertain ? "Save not confirmed" : `Error — ${saved} saved, ${reused} already present, ${result.errors.length} failed`);
      } else {
        setActivity(draft.operations.length ? `Saved ${saved} changes${reused ? `; ${reused} already present` : ""}` : "No changes to save");
        setReply(draft.assistant_message);
      }
      const changed = new Set(result.applied.map((row) => row.type));
      const invalidations = [];
      if (result.uncertain || changed.has("create_section") || changed.has("attach_section") || changed.has("create_item")) {
        invalidations.push(queryClient.invalidateQueries({ queryKey: templateQueryKeys.attachments("certificate", templateUuid) }));
      }
      if (result.uncertain || changed.has("create_section")) {
        invalidations.push(queryClient.invalidateQueries({ queryKey: templateQueryKeys.library("certificate") }));
      }
      if (result.uncertain || changed.has("create_item")) {
        invalidations.push(queryClient.invalidateQueries({ queryKey: ["oh-templates", "certificate", "items"] }));
      }
      try {
        await Promise.all(invalidations);
      } catch {
        if (active.current) writeNote([...result.errors, "Could not refresh the editor. Review before retrying."].join("\n"));
      }
      if (!active.current) return;
      const rows = queryClient.getQueryData<typeof attachments>(
        templateQueryKeys.attachments("certificate", templateUuid),
      );
      const created = rows?.find((row) => !known.has(row.uuid));
      if (active.current && created) {
        select({ type: "section", attachmentUuid: created.uuid });
      }
    } catch (error) {
      if (active.current) {
        setReply("");
        if (controller.signal.aborted) {
          setActivity(approval ? "Approval outcome not confirmed — review the template" : "Cancelled — no changes sent");
        } else {
          setActivity(approval && deletionResult?.completed ? `${deletionResult.completed} approved deletions completed; response incomplete` : "Error");
          writeNote(approval ? "Could not confirm the approval outcome. Review the template before requesting another approval." : getErrorMessage(error, "The draft could not be written."));
        }
      }
    } finally {
      if (active.current) {
        setStreaming(false);
        setApplying(false);
      }
    }
  }

  function decideDeletions(rejectAll = false) {
    if (!pendingApproval || !conversationId.current || streaming) return;
    if (new Date(pendingApproval.expires_at).getTime() <= Date.now()) {
      setPendingApproval(null);
      writeNote("Approval expired. Request a fresh proposal.");
      return;
    }
    const decisions = Object.fromEntries(pendingApproval.approvals.map((target) => [target.id, !rejectAll && !!selectedDeletions[target.id]]));
    void send("", { approval_token: pendingApproval.token, conversation_id: conversationId.current, decisions });
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

          </div>
        )}

        {previewing ? null : (
          <form

            className={cn("shrink-0 overflow-y-auto bg-transparent [scrollbar-gutter:stable] py-2", CERTIFICATE_CONTENT_GUTTERS)}

            onSubmit={(event) => {
              event.preventDefault();
              const text = prompt.trim();
              if (!text || streaming || isLoading || pendingApproval) {
                return;
              }
              setPrompt("");
              void send(text);
            }}

          >
            <div data-certificate-composer-content className={CERTIFICATE_CONTENT_WIDTH}>
              <div data-certificate-composer-shell className="rounded-md bg-white/70 shadow-[0_2px_10px_rgb(31_42_36/0.08)] focus-within:ring-2 focus-within:ring-brand-primary/10">
                {activity || note ? <div className="px-3 pt-2 text-xs">
                  <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-dash-muted">
                    {streaming ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <Sparkles className="size-3" aria-hidden />}
                    {activity}
                  </p>
                  {note ? <>
                    <p role="alert" className="mt-1 line-clamp-2 text-red-700">{note.split("\n")[0]}</p>
                    {note.includes("\n") ? <details className="mt-1 text-red-700"><summary className="cursor-pointer">View all errors</summary><p className="max-h-24 overflow-y-auto whitespace-pre-wrap py-1">{note}</p></details> : null}
                  </> : null}
                  {reply ? <details className="mt-1 text-dash-muted"><summary className="cursor-pointer">View assistant summary</summary><p className="max-h-24 overflow-y-auto whitespace-pre-wrap py-1 leading-5">{reply}</p></details> : null}
                </div> : null}
                {pendingApproval ? <div role="group" aria-label="Approve certificate deletions" className="space-y-2 px-3 py-2 text-xs">
                  <p className="font-medium text-brand-navy">Review exact deletions. Nothing runs until approved.</p>
                  <div className="max-h-40 space-y-2 overflow-y-auto">
                    {pendingApproval.approvals.map((target) => <label key={target.id} className="flex items-start gap-2">
                      <input type="checkbox" aria-label={target.label} checked={!!selectedDeletions[target.id]} onChange={(event) => setSelectedDeletions((current) => ({ ...current, [target.id]: event.target.checked }))} />
                      <span><span className="font-medium">{target.label}</span><span className="block text-dash-muted">{target.effect}</span></span>
                    </label>)}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" disabled={!Object.values(selectedDeletions).some(Boolean)} onClick={() => decideDeletions()} className="rounded-lg bg-brand-primary px-3 py-1.5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 disabled:opacity-40">Approve selected</button>
                    <button type="button" onClick={() => decideDeletions(true)} className="rounded-lg bg-white px-3 py-1.5 text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30">Reject all</button>
                  </div>
                </div> : null}
                <div className="flex items-end gap-3 px-3 py-1.5">
                  <textarea
                    ref={composerRef}
                    aria-label="Describe changes for the certificate assistant"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    rows={1}
                    disabled={isLoading}
                    placeholder="Write the next section, item, or field"
                    className="min-h-8 flex-1 resize-none bg-transparent py-1 text-sm leading-5 text-brand-navy outline-none placeholder:text-dash-muted disabled:opacity-60"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                  {streaming ? <button
                    type="button"
                    aria-label="Cancel assistant"
                    title={applying ? "Changes are being saved; cancellation cannot undo a save" : "Cancel generation"}
                    disabled={applying}
                    onClick={() => streamAbort.current?.abort()}
                    className="mb-1 grid size-8 place-items-center rounded-full bg-white text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 disabled:opacity-40"
                  ><Square className="size-3.5" aria-hidden /></button> : null}
                  <button
                    type="submit"
                    disabled={streaming || isLoading || !!pendingApproval || !prompt.trim()}
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

