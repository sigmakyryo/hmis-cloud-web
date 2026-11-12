import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CertificateStudio } from "@/features/oh-template-builder/components/CertificateStudio";
import type { BuilderSelection } from "@/features/oh-template-builder/template-builder.types";

const state = vi.hoisted(() => ({
  toast: vi.fn(),
  kind: "certificate" as "exam" | "certificate",
  selection: { type: "template" } as BuilderSelection,
  apply: vi.fn(), invalidate: vi.fn(), createSection: vi.fn(), attachSection: vi.fn(), select: vi.fn(), flush: vi.fn(), publish: vi.fn(), replace: vi.fn(), rename: vi.fn(), pending: false,
}));
vi.mock("@/features/oh-template-builder/lib/templateAi", async (original) => ({ ...await original<typeof import("@/features/oh-template-builder/lib/templateAi")>(), applyCofTemplateAiOperations: state.apply, applyExamTemplateAiOperations: state.apply }));
vi.mock("sonner", () => ({ toast: { error: state.toast } }));
vi.mock("next/navigation", () => ({ usePathname: () => "/templates/certificate/test", useRouter: () => ({ replace: state.replace }) }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: state.invalidate, getQueryData: vi.fn() }) }));
vi.mock("@/features/oh-template-builder/hooks/useTemplateBuilder", () => ({
  useTemplateBuilder: () => ({
    template: { name: "Workplace fitness" }, templateUuid: "test", kind: state.kind,
    attachments: [{ uuid: "a", sectionUuid: "s", section: { name: "Medical history" } }],
    selection: state.selection, select: state.select, isLoading: false,
    library: [{ uuid: "library-section", name: "Vision screening", code: "VISION" }, { uuid: "other-section", name: "Hearing screening", code: "HEARING" }],
    attachSection: state.attachSection, createSection: state.createSection, publishTemplate: state.publish, flushPendingSaves: state.flush,
    renameTemplate: state.rename, isPending: () => state.pending, isBusy: false,
  }),
  useSectionItems: () => ({ data: { items: [] }, isPending: false }),
}));
vi.mock("@/features/oh-template-builder/components/TemplateInspector", () => ({
  TemplateInspector: () => <div>{state.selection.type === "template" ? "Template inspector" : "Selected section inspector"}</div>,
}));
vi.mock("@/features/oh-template-builder/components/TemplateCanvas", () => ({ TemplateCanvas: () => <div>Complete document canvas</div> }));
vi.mock("@/features/oh-template-builder/components/TemplatePreview", () => ({ TemplatePreview: () => <div>Certificate preview</div> }));
vi.mock("@/features/oh-template-builder/stores/certificate-studio.store", () => ({
  useCertificateStudioStore: (selector: (value: object) => unknown) => selector({ acceptOperation: vi.fn(), note: null, setNote: vi.fn() }),
  whenStudioIdle: vi.fn(),
}));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
beforeEach(() => {
  vi.clearAllMocks();
  state.kind = "certificate";
  state.selection = { type: "template" };
  state.pending = false;
  state.apply.mockResolvedValue({ applied: [], errors: [] });
  state.invalidate.mockResolvedValue(undefined);
  state.attachSection.mockResolvedValue({ uuid: "attached" });
  state.flush.mockResolvedValue(true);
  state.select.mockImplementation((selection: BuilderSelection) => { state.selection = selection; });
});

describe("certificate studio layout and save guards", () => {
  it("changes configuration inside the right sidebar and leaves the document in place", () => {
    const { rerender } = render(<CertificateStudio view="edit" />);
    const sidebar = screen.getByRole("complementary", { name: "Certificate editor sidebar" });
    expect(within(sidebar).getByText("Template inspector")).toBeInTheDocument();
    const canvas = screen.getByText("Complete document canvas");
    fireEvent.click(within(screen.getByRole("complementary", { name: "Certificate section outline" })).getByRole("button", { name: "Medical history" }));
    rerender(<CertificateStudio view="edit" />);
    expect(within(sidebar).getByText("Section settings")).toBeInTheDocument();
    expect(within(sidebar).getByText("Selected section inspector")).toBeInTheDocument();
    expect(screen.getByText("Complete document canvas")).toBe(canvas);
  });

  it("places sections left and configuration right without a left canvas divider", () => {
    render(<CertificateStudio view="edit" />);
    const outline = screen.getByRole("complementary", { name: "Certificate section outline" });
    const config = screen.getByRole("complementary", { name: "Certificate editor sidebar" });
    const canvas = screen.getByText("Complete document canvas");
    expect(outline.compareDocumentPosition(canvas) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(canvas.compareDocumentPosition(config) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(outline.className).not.toMatch(/border-(?:l|r|t|b)/);
    expect(config).not.toHaveClass("md:border-l");
    expect(config).toHaveClass("border-y", "border-r");
  });

  it("keeps the identity in one top-left flex row and view controls centered", () => {
    render(<CertificateStudio view="edit" />);
    const header = screen.getByRole("banner", { name: "Certificate editor header" });
    const back = within(header).getByRole("link", { name: "Back to forms" });
    const title = within(header).getByRole("heading", { name: "Workplace fitness" });
    expect(back.parentElement).toBe(title.parentElement);
    expect(title.parentElement).toHaveClass("flex", "items-center");
    const controls = within(header).getByLabelText("Editor view");
    expect(controls.parentElement).toHaveClass("justify-center");
    expect(within(controls).getByRole("button", { name: "Build" })).toBeInTheDocument();
    expect(within(controls).getByRole("button", { name: "Preview" })).toBeInTheDocument();
  });

  it("keeps an arrow-only Forms back link and dynamic title with circular actions at the other end", () => {
    render(<CertificateStudio view="edit" />);
    const header = screen.getByRole("banner", { name: "Certificate editor header" });
    const back = within(header).getByRole("link", { name: "Back to forms" });
    expect(back).toHaveAttribute("href", "/occupational-health/forms");
    expect(back.textContent).toBe("");
    expect(within(header).queryByText("Certificates")).not.toBeInTheDocument();
    const title = within(header).getByRole("heading", { name: "Workplace fitness" });
    expect(title).toHaveClass("min-w-0", "truncate");
    expect(title).toHaveAttribute("title", "Workplace fitness");
    expect(title.parentElement?.parentElement).toHaveClass("justify-between");
    const search = within(header).getByRole("button", { name: "Search section library" });
    const add = within(header).getByRole("button", { name: "Add section" });
    expect(search).toHaveClass("rounded-full", "size-7", "bg-white");
    expect(add).toHaveClass("rounded-full", "size-7", "bg-brand-primary", "text-white");
    for (const action of [search, add]) {
      expect(action).toHaveAttribute("title", action.getAttribute("aria-label"));
      expect(action).toHaveClass("focus-visible:ring-2");
    }
    expect(search.parentElement).toBe(add.parentElement);
    expect(screen.queryByRole("button", { name: "Add a section" })).not.toBeInTheDocument();
  });

  it("opens the existing searchable library and attaches the selected shared section", async () => {
    render(<CertificateStudio view="edit" />);
    const search = screen.getByRole("button", { name: "Search section library" });
    fireEvent.click(search);
    expect(search).toHaveAttribute("aria-expanded", "true");
    const dialog = screen.getByRole("dialog", { name: "Add section" });
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Search shared sections" }), { target: { value: "VISION" } });
    expect(within(dialog).getByText("Vision screening")).toBeInTheDocument();
    expect(within(dialog).queryByText("Hearing screening")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /Vision screening/ }));
    await waitFor(() => expect(state.attachSection).toHaveBeenCalledWith("library-section"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(search).toHaveAttribute("aria-expanded", "false");
    expect(state.createSection).not.toHaveBeenCalled();
  });

  it("uses the existing new-section handler and retains its pending guard", async () => {
    const { rerender } = render(<CertificateStudio view="edit" />);
    fireEvent.click(screen.getByRole("button", { name: "Add section" }));
    await waitFor(() => expect(state.createSection).toHaveBeenCalledWith(expect.objectContaining({ name: "New section", code: "SECTION_2", contentMode: "items" })));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    state.pending = true;
    rerender(<CertificateStudio view="edit" />);
    expect(screen.getByRole("button", { name: "Add section" })).toBeDisabled();
  });

  it("reserves a full-height white right panel outside the header that takes unused document space", () => {
    render(<CertificateStudio view="edit" />);
    const workspace = screen.getByLabelText("Certificate workspace");
    const header = screen.getByRole("banner", { name: "Certificate editor header" });
    const outline = screen.getByRole("complementary", { name: "Certificate section outline" });
    const config = screen.getByRole("complementary", { name: "Certificate editor sidebar" });
    expect(workspace).toContainElement(header);
    expect(workspace).not.toContainElement(config);
    expect(workspace.parentElement).toBe(config.parentElement);
    expect(workspace.parentElement).toHaveClass("bg-[#fafaf9]");
    expect(workspace).toHaveClass("bg-inherit");
    expect(outline).toHaveClass("bg-inherit");
    expect(config).toHaveClass("bg-white", "border-y", "border-r", "rounded-lg");
    expect(screen.queryByLabelText("Configuration panel spacing")).not.toBeInTheDocument();
    expect(config).toHaveClass("my-3", "mr-3", "md:grow", "md:basis-[var(--certificate-config-width)]", "md:min-w-[var(--certificate-config-width)]");
    expect(config).not.toHaveClass("md:max-w-[var(--certificate-sidebar-width)]");
    expect(workspace.parentElement).toHaveClass("[--certificate-config-width:16rem]", "lg:[--certificate-config-width:20rem]", "xl:[--certificate-config-width:22rem]", "[--certificate-document-column:51rem]");
    expect(workspace).toHaveClass("md:basis-[calc(var(--certificate-sidebar-width)+var(--certificate-document-column))]", "md:max-w-[calc(var(--certificate-sidebar-width)+var(--certificate-document-column))]");
    expect(outline).toHaveClass("md:basis-[var(--certificate-sidebar-width)]");
    expect(header).toHaveClass("md:grid-cols-[var(--certificate-sidebar-width)_minmax(0,1fr)]");
    expect(config.className).toContain("shadow-[0_1px_6px_rgb(31_42_36/0.06)]");
    expect(header.className).not.toMatch(/border(?:-|\s)/);
    expect(within(header).queryByText("Autosave enabled")).not.toBeInTheDocument();
  });

  it("uses the same max width and responsive gutters for the composer as the sections", () => {
    render(<CertificateStudio view="edit" />);
    const input = screen.getByRole("textbox", { name: "Describe changes for the certificate assistant" });
    expect(input.closest("form")).toHaveClass("px-4", "sm:px-6", "overflow-y-auto", "[scrollbar-gutter:stable]");
    const content = input.closest("[data-certificate-composer-content]");
    expect(content).toHaveClass("mx-auto", "w-full", "max-w-3xl");
  });

  it("aligns publishing with the document content end rather than the workspace edge", () => {
    render(<CertificateStudio view="edit" />);
    const publish = screen.getByRole("button", { name: "Publish" });
    const actions = screen.getByLabelText("Certificate publishing actions");
    expect(actions).toContainElement(publish);
    expect(actions).toHaveClass("justify-self-end", "xl:col-start-3");
    expect(actions.className).not.toMatch(/absolute|right-0/);
    const content = publish.closest("[data-certificate-header-content]");
    expect(content).toHaveClass("mx-auto", "w-full", "max-w-3xl");
    expect(content?.parentElement).toHaveClass("px-4", "sm:px-6", "overflow-y-auto", "[scrollbar-gutter:stable]");
    expect(content).toContainElement(screen.getByLabelText("Editor view"));
  });

  it("removes composer dividers while retaining input and keyboard affordances", () => {
    render(<CertificateStudio view="edit" />);
    const input = screen.getByRole("textbox", { name: "Describe changes for the certificate assistant" });
    expect(input.closest("form")?.className).not.toMatch(/border(?:-|\s)/);
    expect(input.parentElement).not.toHaveClass("border", "border-t", "border-b");
    expect(input.closest("[data-certificate-composer-shell]")).toHaveClass("focus-within:ring-2", "shadow-[0_2px_10px_rgb(31_42_36/0.08)]");
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    fireEvent.change(input, { target: { value: "Add a section" } });
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
  });

  it("omits the AI heading while keeping the input accessible", () => {
    render(<CertificateStudio view="edit" />);
    expect(screen.queryByText("Build with AI")).not.toBeInTheDocument();
    expect(screen.queryByText("Describe a section, item or field")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Describe changes for the certificate assistant" })).toBeInTheDocument();
  });

  it("shows actionable startup failures and keeps the composer usable for a retry", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("upstream unavailable", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<CertificateStudio view="edit" />);
    const input = screen.getByRole("textbox", { name: "Describe changes for the certificate assistant" });
    fireEvent.change(input, { target: { value: "Help with draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("check the AI provider configuration");
    fireEvent.change(input, { target: { value: "Try again" } });
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
  });

  it("renders a completed JSON stream without replacing the document", async () => {
    const draft = JSON.stringify({ assistant_message: "Ready to edit.", operations: [] });
    const stream = `data: ${JSON.stringify({ type: "text_delta", delta: draft })}\n\ndata: [DONE]\n\n`;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(stream, { headers: { "content-type": "text/event-stream" } })));
    render(<CertificateStudio view="edit" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Describe changes for the certificate assistant" }), { target: { value: "Help with draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(screen.getByText("Ready to edit.")).toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Complete document canvas")).toBeInTheDocument();
  });

  it("batches thirteen item operations and only announces success after confirmed apply", async () => {
    const operations = Array.from({ length: 13 }, (_, i) => ({ type: "create_item", section_code: `SECTION_${i}`, name: `Item ${i}`, code: `ITEM_${i}` }));
    const claim = "Proposed clinical items for all attached sections.";
    const draft = JSON.stringify({ assistant_message: claim, operations });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(`data: ${JSON.stringify({ type: "text_delta", delta: draft })}\n\ndata: [DONE]\n\n`, { headers: { "content-type": "text/event-stream" } })));
    let finish!: (value: object) => void;
    state.apply.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<CertificateStudio view="edit" />);
    const input = screen.getByRole("textbox", { name: "Describe changes for the certificate assistant" });
    fireEvent.change(input, { target: { value: "Populate existing sections" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(state.apply).toHaveBeenCalledOnce());
    expect(state.apply).toHaveBeenCalledWith("test", { operations });
    expect(screen.getByRole("status")).toHaveTextContent("Applying 13 changes");
    expect(screen.queryByText(claim)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel assistant" })).toBeDisabled();
    expect(input).toBeEnabled();
    finish({ applied: operations.map((operation) => ({ type: operation.type, result: {} })), errors: [] });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Saved 13 changes"));
    expect(screen.getByText(claim).closest("details")).not.toHaveAttribute("open");
    expect(screen.getByRole("status").closest("[data-certificate-composer-shell]")).toBeInTheDocument();
    expect(state.invalidate).toHaveBeenCalledTimes(2);
    expect(state.invalidate.mock.calls.some(([value]) => value.queryKey.includes("library"))).toBe(false);
    expect(state.invalidate).toHaveBeenCalledWith({ queryKey: ["oh-templates", "certificate", "items"] });
  });

  it("reports partial apply honestly and never shows the model's success claim", async () => {
    const claim = "All sections are populated and saved.";
    const operations = [{ type: "create_item", section_code: "VITALS", code: "PULSE", name: "Pulse" }, { type: "create_item", section_code: "MISSING", code: "OTHER", name: "Other" }];
    const draft = JSON.stringify({ assistant_message: claim, operations });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(`data: ${JSON.stringify({ type: "text_delta", delta: draft })}\n\ndata: [DONE]\n\n`, { headers: { "content-type": "text/event-stream" } })));
    state.apply.mockResolvedValue({ applied: [{ type: "create_item", result: {} }], errors: ["create_item: Library section not found."] });
    render(<CertificateStudio view="edit" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Describe changes for the certificate assistant" }), { target: { value: "Populate sections" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Library section not found");
    expect(screen.getByRole("status")).toHaveTextContent("1 saved, 0 already present, 1 failed");
    expect(screen.queryByText(claim)).not.toBeInTheDocument();
  });

  it("does not claim zero changes saved when the apply response is lost", async () => {
    const draft = JSON.stringify({ assistant_message: "All done", operations: [{ type: "create_item", section_code: "VITALS", code: "PULSE", name: "Pulse" }] });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(`data: ${JSON.stringify({ type: "text_delta", delta: draft })}\n\ndata: [DONE]\n\n`, { headers: { "content-type": "text/event-stream" } })));
    state.apply.mockRejectedValue(new Error("Connection lost"));
    render(<CertificateStudio view="edit" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Describe changes for the certificate assistant" }), { target: { value: "Draft items" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Save could not be confirmed. Review before retrying.");
    expect(screen.getByRole("status")).toHaveTextContent("Save not confirmed");
    expect(screen.queryByText("All done")).not.toBeInTheDocument();
    expect(state.apply).toHaveBeenCalledOnce();
  });

  it("lets generation be cancelled from the composer without applying a partial draft", async () => {
    vi.stubGlobal("fetch", vi.fn((_url, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new DOMException("Cancelled", "AbortError")));
    })));
    render(<CertificateStudio view="edit" />);
    const input = screen.getByRole("textbox", { name: "Describe changes for the certificate assistant" });
    fireEvent.change(input, { target: { value: "Draft sections" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel assistant" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Cancelled — no changes sent"));
    expect(state.apply).not.toHaveBeenCalled();
    expect(input).toBeEnabled();
  });

  it("flushes pending edits before navigating to preview", async () => {
    render(<CertificateStudio view="edit" />);
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    await waitFor(() => expect(state.replace).toHaveBeenCalledWith("/templates/certificate/test?view=preview", { scroll: false }));
    expect(state.flush).toHaveBeenCalledOnce();
  });

  it("does not leave Build if saving pending edits fails", async () => {
    state.flush.mockResolvedValue(false);
    render(<CertificateStudio view="edit" />);
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    await waitFor(() => expect(state.flush).toHaveBeenCalledOnce());
    expect(state.replace).not.toHaveBeenCalled();
  });

  it("does not publish a template if pending edits fail to save", async () => {
    state.flush.mockResolvedValue(false);
    render(<CertificateStudio view="edit" />);
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(state.flush).toHaveBeenCalledOnce());
    expect(state.publish).not.toHaveBeenCalled();
  });
});


function controlStream(...events: object[]) {
  return new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") + "data: [DONE]\n\n", { headers: { "content-type": "text/event-stream" } });
}

it("shows a scope-refusal toast without enqueuing mutations", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(controlStream({ type: "refusal", message: "Can't help with that." })));
  render(<CertificateStudio view="edit" />);
  fireEvent.change(screen.getByRole("textbox", { name: "Describe changes for the certificate assistant" }), { target: { value: "Write a poem" } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  await waitFor(() => expect(state.toast).toHaveBeenCalledWith("Can't help with that."));
  expect(state.apply).not.toHaveBeenCalled();
});

it.each(["exam", "certificate"] as const)("%s requires exact target selection and bound native approval", async (kind) => {
  state.kind = kind;
  const fetch = vi.fn().mockResolvedValueOnce(controlStream({ type: "approval_required", token: "nonce", expires_at: "2099-01-01T00:00:00Z", approvals: [{ id: "delete-1", label: "Detach Vitals", effect: "Shared content remains." }] }, { type: "conversation", conversation_id: "conversation" })).mockResolvedValueOnce(controlStream({ type: "approval_result", completed: 1, failed: 0 }));
  vi.stubGlobal("fetch", fetch);
  render(<CertificateStudio view="edit" />);
  fireEvent.change(screen.getByRole("textbox", { name: `Describe changes for the ${kind} assistant` }), { target: { value: "Remove Vitals" } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  const approve = await screen.findByRole("button", { name: "Approve selected" });
  expect(approve).toBeDisabled();
  expect(state.apply).not.toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("checkbox", { name: "Detach Vitals" }));
  fireEvent.click(approve);
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ approval_token: "nonce", conversation_id: "conversation", decisions: { "delete-1": true } });
  await screen.findByText("1 approved deletions completed");
  expect(state.apply).not.toHaveBeenCalled();
});

it("rejects all pending targets without calling the mutation queue", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(controlStream({ type: "approval_required", token: "nonce", expires_at: "2099-01-01T00:00:00Z", approvals: [{ id: "delete-1", label: "Detach Vitals", effect: "Shared content remains." }] }, { type: "conversation", conversation_id: "conversation" })).mockResolvedValueOnce(controlStream({ type: "approval_result", completed: 0, rejected: true }));
  vi.stubGlobal("fetch", fetch);
  render(<CertificateStudio view="edit" />);
  fireEvent.change(screen.getByRole("textbox", { name: "Describe changes for the certificate assistant" }), { target: { value: "Remove Vitals" } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  fireEvent.click(await screen.findByRole("button", { name: "Reject all" }));
  await screen.findByText("Rejected — no deletion performed");
  expect(JSON.parse(fetch.mock.calls[1][1].body).decisions).toEqual({ "delete-1": false });
  expect(state.apply).not.toHaveBeenCalled();
});


it("gives exam the approved studio shell but sends drafts only to the exam API", async () => {
  state.kind = "exam";
  const fetch = vi.fn().mockResolvedValue(controlStream({ type: "refusal", message: "Can't help with that." }));
  vi.stubGlobal("fetch", fetch);
  render(<CertificateStudio view="edit" />);
  expect(screen.getByRole("link", { name: "Back to forms" })).toHaveAttribute("href", "/occupational-health/forms");
  expect(screen.getByRole("complementary", { name: "Exam editor sidebar" })).toHaveClass("my-3", "mr-3", "rounded-lg", "md:grow");
  expect(screen.getByRole("banner", { name: "Exam editor header" })).toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: "Describe changes for the exam assistant" }), { target: { value: "Write a poem" } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  await waitFor(() => expect(state.toast).toHaveBeenCalledWith("Can't help with that."));
  expect(fetch.mock.calls[0][0]).toBe("/api/occupational-health/exam-templates/test/ai/stream");
  expect(state.apply).not.toHaveBeenCalled();
});


it("preserves exam header renaming through the existing save handler", async () => {
  state.kind = "exam";
  state.rename.mockResolvedValue(true);
  render(<CertificateStudio view="edit" />);
  const name = screen.getByRole("textbox", { name: "Template name" });
  fireEvent.change(name, { target: { value: "Updated examination" } });
  fireEvent.blur(name);
  await waitFor(() => expect(state.rename).toHaveBeenCalledWith("Updated examination"));
});
