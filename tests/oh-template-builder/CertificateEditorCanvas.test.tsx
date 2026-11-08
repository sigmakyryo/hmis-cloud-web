import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CertificateEditorCanvas } from "@/features/oh-template-builder/components/CertificateEditorCanvas";
import { scrollToCertificateSection } from "@/features/oh-template-builder/lib/certificateEditorScroll";
import type { BuilderAttachment, BuilderSelection } from "@/features/oh-template-builder/template-builder.types";

const state = vi.hoisted(() => ({
  selection: { type: "template" } as BuilderSelection,
  select: vi.fn(),
  moveSection: vi.fn(),
  busy: false,
}));
const attachments: BuilderAttachment[] = ["Medical history", "Fitness assessment"].map((name, index) => ({
  uuid: `attachment-${index}`, sectionUuid: `section-${index}`, sortOrder: index, itemCount: 0,
  section: {
    uuid: `section-${index}`, code: `SECTION_${index}`, name, isMandatory: false,
    selectionMode: "inclusive", isSystem: false, active: true, contentMode: "direct",
    defaultResponseFields: [{ code: "notes", label: `${name} notes`, response_type: "text", options: [], validation: {}, prompt_after_select: true }],
  },
}));
vi.mock("@/features/oh-template-builder/hooks/useTemplateBuilder", () => ({
  useTemplateBuilder: () => ({ attachments, template: { name: "Fitness certificate" }, selection: state.selection, select: state.select, isLoading: false, isBusy: state.busy, moveSection: state.moveSection }),
  useSectionItems: () => ({ data: { items: [], total: 0 }, isPending: false }),
}));
vi.mock("@/features/oh-template-builder/components/QuickAddItem", () => ({ QuickAddItem: () => null }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

beforeEach(() => {
  HTMLElement.prototype.scrollTo = vi.fn();
  vi.clearAllMocks();
  state.selection = { type: "template" };
  state.busy = false;
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
});

describe("certificate document editor", () => {
  it("shares the composer's document width and horizontal gutters", () => {
    render(<CertificateEditorCanvas onAddSection={vi.fn()} />);
    const viewport = screen.getByLabelText("Certificate document editor");
    expect(viewport).toHaveClass("px-4", "sm:px-6", "overflow-y-auto", "[scrollbar-gutter:stable]");
    expect(viewport.querySelector("[data-certificate-content]")).toHaveClass("mx-auto", "w-full", "max-w-3xl");
  });

  it("shows only actual sections without document introduction or metadata chrome", () => {
    render(<CertificateEditorCanvas onAddSection={vi.fn()} />);
    for (const text of ["Document canvas", "Select a section to edit its settings on the left", "Occupational health", "Template draft", "Fitness certificate", "Certificate of fitness · 2 sections"]) {
      expect(screen.queryByText(text)).not.toBeInTheDocument();
    }
    expect(screen.queryByText(/Fields below show the form layout/)).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Medical history" })).toBeInTheDocument();
    expect(screen.getByLabelText("Medical history notes")).toBeInTheDocument();
  });

  it("keeps every section and actual field mounted when selection changes", () => {
    const { rerender } = render(<CertificateEditorCanvas onAddSection={vi.fn()} />);
    const field = screen.getByLabelText("Medical history notes");
    fireEvent.change(field, { target: { value: "Temporary test value" } });
    state.selection = { type: "section", attachmentUuid: "attachment-1" };
    rerender(<CertificateEditorCanvas onAddSection={vi.fn()} />);
    expect(screen.getByRole("region", { name: "Medical history" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Fitness assessment" })).toBeInTheDocument();
    expect(screen.getByLabelText("Medical history notes")).toBe(field);
    expect(field).toHaveValue("Temporary test value");
    expect(screen.getByLabelText("Fitness assessment notes")).toBeInTheDocument();
  });

  it("selects section settings from the canvas without replacing the form", () => {
    render(<CertificateEditorCanvas onAddSection={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Settings for Medical history" }));
    expect(state.select).toHaveBeenCalledWith({ type: "section", attachmentUuid: "attachment-0" });
    fireEvent.focus(screen.getByLabelText("Fitness assessment notes"));
    expect(state.select).toHaveBeenLastCalledWith({ type: "section", attachmentUuid: "attachment-1" });
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
  });

  it("scrolls only the document viewport to an offscreen selection", () => {
    const { rerender } = render(<CertificateEditorCanvas onAddSection={vi.fn()} />);
    const viewport = screen.getByLabelText("Certificate document editor");
    const section = screen.getByRole("region", { name: "Fitness assessment" });
    viewport.getBoundingClientRect = vi.fn().mockReturnValue({ top: 100, bottom: 500 });
    section.getBoundingClientRect = vi.fn().mockReturnValue({ top: 900, bottom: 1200 });
    const scrollTo = vi.fn();
    viewport.scrollTo = scrollTo;
    state.selection = { type: "section", attachmentUuid: "attachment-1" };
    rerender(<CertificateEditorCanvas onAddSection={vi.fn()} />);
    expect(scrollTo).toHaveBeenCalledWith({ top: 776, behavior: "smooth" });
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
  });

  it("can navigate to the already-selected section again after manual scrolling", () => {
    render(<CertificateEditorCanvas onAddSection={vi.fn()} />);
    const viewport = screen.getByLabelText("Certificate document editor");
    viewport.getBoundingClientRect = vi.fn().mockReturnValue({ top: 100, bottom: 500 });
    screen.getByRole("region", { name: "Fitness assessment" }).getBoundingClientRect = vi.fn().mockReturnValue({ top: 900 });
    viewport.scrollTo = vi.fn();
    scrollToCertificateSection("attachment-1");
    scrollToCertificateSection("attachment-1");
    expect(viewport.scrollTo).toHaveBeenCalledTimes(2);
  });

  it("respects reduced motion when scrolling", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    const { rerender } = render(<CertificateEditorCanvas onAddSection={vi.fn()} />);
    const viewport = screen.getByLabelText("Certificate document editor");
    viewport.getBoundingClientRect = vi.fn().mockReturnValue({ top: 100, bottom: 500 });
    screen.getByRole("region", { name: "Fitness assessment" }).getBoundingClientRect = vi.fn().mockReturnValue({ top: 900 });
    viewport.scrollTo = vi.fn();
    state.selection = { type: "section", attachmentUuid: "attachment-1" };
    rerender(<CertificateEditorCanvas onAddSection={vi.fn()} />);
    expect(viewport.scrollTo).toHaveBeenCalledWith({ top: 776, behavior: "auto" });
  });

  it("preserves section ordering actions and disables mutations while busy", () => {
    const add = vi.fn();
    const { rerender } = render(<CertificateEditorCanvas onAddSection={add} />);
    fireEvent.click(screen.getByRole("button", { name: "Move Medical history down" }));
    expect(state.moveSection).toHaveBeenCalledWith("attachment-0", "down");
    expect(within(screen.getByRole("region", { name: "Medical history" })).getByRole("button", { name: "Move Medical history up" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Add section" }));
    expect(add).toHaveBeenCalledOnce();
    state.busy = true;
    rerender(<CertificateEditorCanvas onAddSection={add} />);
    expect(screen.getByRole("button", { name: "Add section" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Medical history down" })).toBeDisabled();
  });
});
