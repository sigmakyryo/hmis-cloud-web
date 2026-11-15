import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OhFormGroupsBoard } from "@/features/occupational-health/components/OhFormGroupsBoard";
import {
  buildBoard,
  moveGroup,
  moveItem,
  nudgeItem,
  toLayoutPayload,
  type BoardItem,
} from "@/features/occupational-health/lib/oh-form-groups-layout";
import { ohFormsHref, formsFiltersFromSearchParams } from "@/features/occupational-health/utils/oh-forms-list-url";

const service = vi.hoisted(() => ({
  createFormGroup: vi.fn(async (name: string) => ({ uuid: "g-new", name })),
  renameFormGroup: vi.fn(async (uuid: string, name: string) => ({ uuid, name })),
  deleteFormGroup: vi.fn(async (uuid: string) => ({ uuid, deleted: true })),
  saveFormLayout: vi.fn(async () => []),
}));
vi.mock("@/features/occupational-health/services/oh.service", () => service);
vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast: vi.fn() }) }));

const items: BoardItem[] = [
  { key: "form:a", name: "Audiometry", typeLabel: "Exam", statusLabel: "Published v2", groupUuid: "g1", sortOrder: 1, ref: { form_uuid: "a" } },
  { key: "form:b", name: "Spirometry", typeLabel: "Exam", statusLabel: "Draft", groupUuid: "g1", sortOrder: 0, ref: { form_uuid: "b" } },
  { key: "form:c", name: "Driver COF", typeLabel: "COF", statusLabel: "Draft", groupUuid: "g2", sortOrder: 0, ref: { form_uuid: "c" } },
  { key: "template:employee:t1", name: "Intake questionnaire", typeLabel: "Employee", statusLabel: "Draft", groupUuid: null, sortOrder: 0, ref: { template_kind: "employee", template_uuid: "t1" } },
];
const groups = [
  { uuid: "g2", name: "Certificates", sort_order: 1 },
  { uuid: "g1", name: "Pre-employment", sort_order: 0 },
];

describe("form groups layout model", () => {
  it("orders groups and forms by saved order with Ungrouped last", () => {
    const board = buildBoard(items, groups);
    expect(board.map((g) => g.name)).toEqual(["Pre-employment", "Certificates", "Ungrouped"]);
    expect(board[0].keys).toEqual(["form:b", "form:a"]);
    expect(board[2].keys).toEqual(["template:employee:t1"]);
  });

  it("moves, nudges and reorders groups without losing forms", () => {
    let board = buildBoard(items, groups);
    board = moveItem(board, "template:employee:t1", "g2", 0);
    expect(board[1].keys).toEqual(["template:employee:t1", "form:c"]);
    expect(board[2].keys).toEqual([]);
    board = nudgeItem(board, "form:b", 1);
    expect(board[0].keys).toEqual(["form:a", "form:b"]);
    expect(nudgeItem(board, "form:b", 1)).toBe(board);
    board = moveGroup(board, "g2", -1);
    expect(board.map((g) => g.uuid)).toEqual(["g2", "g1", null]);
    expect(toLayoutPayload(board, new Map(items.map((i) => [i.key, i])))).toEqual([
      { uuid: "g2", items: [{ template_kind: "employee", template_uuid: "t1" }, { form_uuid: "c" }] },
      { uuid: "g1", items: [{ form_uuid: "a" }, { form_uuid: "b" }] },
      { uuid: null, items: [] },
    ]);
  });

  it("persists the organise mode in the URL for live forms only", () => {
    expect(ohFormsHref({ view: "live", layout: "groups" })).toBe("/occupational-health/forms?layout=groups");
    expect(ohFormsHref({ view: "archived", layout: "groups" })).toBe("/occupational-health/forms?view=archived");
    expect(formsFiltersFromSearchParams(new URLSearchParams("layout=groups")).layout).toBe("groups");
  });
});

describe("OhFormGroupsBoard", () => {
  const onChanged = vi.fn(async () => undefined);
  beforeEach(() => {
    Object.values(service).forEach((fn) => fn.mockClear());
    onChanged.mockClear();
  });
  afterEach(() => cleanup());

  function renderBoard() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <OhFormGroupsBoard items={items} groups={groups} onChanged={onChanged} />
      </QueryClientProvider>,
    );
  }

  it("renders a panel per group with drag handles", () => {
    renderBoard();
    const panels = screen.getAllByTestId("oh-form-group-panel");
    expect(panels.map((panel) => panel.getAttribute("data-group"))).toEqual(["g1", "g2", "__ungrouped__"]);
    expect(screen.getByRole("button", { name: "Pre-employment" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Drag Audiometry" })).toBeInTheDocument();
  });

  it("keyboard fallback: move to another group saves the whole layout", async () => {
    renderBoard();
    fireEvent.click(screen.getByRole("button", { name: "Ungrouped" }));
    fireEvent.change(screen.getByLabelText("Move Intake questionnaire to group"), { target: { value: "g1" } });
    await waitFor(() => expect(service.saveFormLayout).toHaveBeenCalledTimes(1));
    expect(service.saveFormLayout).toHaveBeenCalledWith([
      { uuid: "g1", items: [{ form_uuid: "b" }, { form_uuid: "a" }, { template_kind: "employee", template_uuid: "t1" }] },
      { uuid: "g2", items: [{ form_uuid: "c" }] },
      { uuid: null, items: [] },
    ]);
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("move up / down buttons reorder forms and groups", async () => {
    renderBoard();
    expect(screen.getByRole("button", { name: "Move Spirometry up" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Move Spirometry down" }));
    await waitFor(() => expect(service.saveFormLayout).toHaveBeenCalledTimes(1));
    expect(service.saveFormLayout.mock.calls[0][0][0].items).toEqual([{ form_uuid: "a" }, { form_uuid: "b" }]);
    fireEvent.click(screen.getByRole("button", { name: "Certificates" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Move Certificates up" })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Move Certificates up" }));
    await waitFor(() => expect(service.saveFormLayout).toHaveBeenCalledTimes(2));
    expect(service.saveFormLayout.mock.calls[1][0].map((g: { uuid: string | null }) => g.uuid)).toEqual(["g2", "g1", null]);
  });

  it("creates, renames and deletes groups", async () => {
    renderBoard();
    fireEvent.change(screen.getByLabelText("New group name"), { target: { value: "Night shift" } });
    fireEvent.click(screen.getByTestId("oh-form-group-create"));
    await waitFor(() => expect(service.createFormGroup).toHaveBeenCalledWith("Night shift"));

    fireEvent.click(screen.getByRole("button", { name: "Certificates" }));
    fireEvent.click(screen.getByRole("button", { name: "Rename Certificates" }));
    const input = screen.getByLabelText("Rename Certificates");
    fireEvent.change(input, { target: { value: "Fitness certificates" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => expect(service.renameFormGroup).toHaveBeenCalledWith("g2", "Fitness certificates"));

    fireEvent.click(screen.getByRole("button", { name: "Pre-employment" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Pre-employment" }));
    expect(await screen.findByText(/Its 2 forms will move to Ungrouped/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("oh-form-group-delete-confirm"));
    await waitFor(() => expect(service.deleteFormGroup).toHaveBeenCalledWith("g1"));
  });

  it("undoes the optimistic change when saving fails", async () => {
    service.saveFormLayout.mockRejectedValueOnce(new Error("nope"));
    renderBoard();
    fireEvent.click(screen.getByRole("button", { name: "Move Spirometry down" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save the new order");
    expect(screen.getAllByTestId("oh-form-group-item").map((el) => el.getAttribute("data-key"))).toEqual(["form:b", "form:a"]);
  });
});
