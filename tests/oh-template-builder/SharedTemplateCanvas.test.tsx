import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TemplateCanvas } from "@/features/oh-template-builder/components/TemplateCanvas";
import type { BuilderSelection, TemplateKind } from "@/features/oh-template-builder/template-builder.types";

const state = vi.hoisted(() => ({ kind: "exam" as TemplateKind, selection: { type: "template" } as BuilderSelection, select: vi.fn(), move: vi.fn(), reorder: vi.fn() }));
vi.mock("@/features/oh-template-builder/hooks/useTemplateBuilder", () => ({
  useTemplateBuilder: () => ({ kind: state.kind, attachments: [{ uuid: "attachment", sectionUuid: "library", section: { name: "Respiratory", selectionMode: "inclusive", contentMode: "items", defaultResponseFields: [], isMandatory: true } }], isLoading: false, selection: state.selection, select: state.select, moveSection: state.move, reorderItems: state.reorder, isBusy: false }),
  useSectionItems: () => ({ data: { total: 1, items: [{ uuid: "item", name: "Spirometry", schedule: [], effectiveResponseFields: [{ code: "value", label: "Result", response_type: "number" }], isMandatory: false }] }, isPending: false, isError: false }),
}));
vi.mock("@/features/oh-template-builder/components/QuickAddItem", () => ({ QuickAddItem: () => <button>Existing quick add</button> }));
vi.mock("@/features/settings/components/modules/occupational-health/template-library/SortableItemList", () => ({ SortableItemList: ({ items, renderItem, onReorder }: { items: { uuid: string }[]; renderItem: (item: object, handle: React.ReactNode) => React.ReactNode; onReorder: (uuids: string[]) => void }) => <><button onClick={() => onReorder(["item"])}>Reorder existing items</button>{items.map((item) => <div key={item.uuid}>{renderItem(item, <span>Drag handle</span>)}</div>)}</> }));

beforeEach(() => { vi.clearAllMocks(); state.selection = { type: "template" }; vi.stubGlobal("matchMedia", () => ({ matches: true })); HTMLElement.prototype.scrollTo = vi.fn(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it.each(["exam", "certificate"] as const)("uses the actual exam heading/item/answer/repeat design and handlers for %s", (kind) => {
  state.kind = kind;
  render(<TemplateCanvas embedded onAddSection={vi.fn()} />);
  expect(screen.getByText("Answers")).toBeInTheDocument();
  const headings = screen.getByText("Answers").closest(".sticky");
  expect(headings).toHaveClass("bg-[#fafaf9]", "sticky", "top-0");
  expect(headings).not.toHaveClass("bg-white/95", "backdrop-blur-sm");
  expect(headings?.className).not.toMatch(/\bborder(?:-|\s|$)/);
  expect(screen.getByText("Repeats")).toBeInTheDocument();
  expect(screen.getByText("Required")).toBeInTheDocument();
  expect(screen.getByText("Any answers")).toBeInTheDocument();
  expect(screen.getByText("1 field")).toBeInTheDocument();
  expect(screen.getByText("Once")).toBeInTheDocument();
  expect(screen.getByText("Existing quick add")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Spirometry/ }));
  expect(state.select).toHaveBeenCalledWith({ type: "item", attachmentUuid: "attachment", itemUuid: "item" });
  fireEvent.click(screen.getByRole("button", { name: "Reorder existing items" }));
  expect(state.reorder).toHaveBeenCalledWith("library", ["item"]);
  const container = document.getElementById("template-editor-viewport");
  expect(container).toHaveClass("bg-inherit", "[scrollbar-gutter:stable]");
  expect(container?.querySelector(".max-w-3xl")).toHaveClass("mx-auto", "w-full");
});

it("opens collapsed sections on outline selection and scrolls to the selected item", async () => {
  const { rerender } = render(<TemplateCanvas embedded onAddSection={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Collapse Respiratory" }));
  expect(screen.queryByRole("button", { name: /Spirometry/ })).not.toBeInTheDocument();
  state.selection = { type: "item", attachmentUuid: "attachment", itemUuid: "item" };
  rerender(<TemplateCanvas embedded onAddSection={vi.fn()} />);
  await screen.findByRole("button", { name: /Spirometry/ });
  expect(screen.getByRole("button", { name: /Spirometry/ })).toHaveAttribute("aria-pressed", "true");
  await waitFor(() => expect(HTMLElement.prototype.scrollTo).toHaveBeenCalled());
});
