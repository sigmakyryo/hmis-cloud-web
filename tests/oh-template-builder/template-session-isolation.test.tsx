import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TemplateBuilderProvider, useTemplateBuilder } from "@/features/oh-template-builder/hooks/useTemplateBuilder";
import type { BuilderAttachment } from "@/features/oh-template-builder/template-builder.types";

const api = vi.hoisted(() => ({ getTemplate: vi.fn(), listAttachments: vi.fn(), listLibrary: vi.fn() }));
vi.mock("@/features/oh-template-builder/lib/templateAdapters", () => ({ getTemplateAdapter: () => api }));
vi.mock("@/features/oh-template-builder/hooks/useBuilderAction", () => ({ useBuilderAction: () => ({ perform: vi.fn(), isPending: () => false, isBusy: false }) }));
const previous: BuilderAttachment = { uuid: "previous-section", sectionUuid: "library-a", sortOrder: 0, itemCount: 0, section: null };

function Probe() {
  const { template, attachments, selection, select } = useTemplateBuilder();
  const [draft, setDraft] = useState("");
  return <><p>{template?.name}</p><p data-testid="selection">{selection.type}</p><p data-testid="sections">{attachments.map((row) => row.uuid).join(",")}</p><input aria-label="Local draft" value={draft} onChange={(event) => setDraft(event.target.value)} /><button onClick={() => select({ type: "section", attachmentUuid: "previous-section" })}>Select previous</button></>;
}
function App({ uuid, client, kind = "certificate" }: { uuid: string; client: QueryClient; kind?: "exam" | "certificate" }) {
  return <QueryClientProvider client={client}><TemplateBuilderProvider kind={kind} templateUuid={uuid}><Probe /></TemplateBuilderProvider></QueryClientProvider>;
}
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  api.getTemplate.mockImplementation(async (uuid: string) => ({ uuid, name: `Template ${uuid}` }));
  api.listLibrary.mockResolvedValue([]);
  api.listAttachments.mockImplementation(async (uuid: string) => uuid === "previous" ? [previous] : []);
});

describe("template session isolation", () => {
  it("opens a new template empty after editing another and resets selection and local forms", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, placeholderData: keepPreviousData } } });
    const { rerender } = render(<App uuid="previous" client={client} />);
    await screen.findByText("Template previous");
    await waitFor(() => expect(screen.getByTestId("sections")).toHaveTextContent("previous-section"));
    fireEvent.click(screen.getByText("Select previous"));
    fireEvent.change(screen.getByLabelText("Local draft"), { target: { value: "Previous edits" } });
    rerender(<App uuid="new" client={client} />);
    expect(screen.getByTestId("sections")).toBeEmptyDOMElement();
    expect(screen.getByTestId("selection")).toHaveTextContent("template");
    expect(screen.getByLabelText("Local draft")).toHaveValue("");
    await screen.findByText("Template new");
    expect(screen.getByTestId("sections")).toBeEmptyDOMElement();
    rerender(<App uuid="previous" client={client} />);
    await screen.findByText("Template previous");
    expect(screen.getByTestId("selection")).toHaveTextContent("template");
    expect(screen.getByLabelText("Local draft")).toHaveValue("");
  });

  it("ignores an old attachment response arriving after navigation to a new template", async () => {
    let resolvePrevious!: (rows: BuilderAttachment[]) => void;
    api.listAttachments.mockImplementation((uuid: string) => uuid === "previous" ? new Promise<BuilderAttachment[]>((resolve) => { resolvePrevious = resolve; }) : Promise.resolve([]));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(<App uuid="previous" client={client} />);
    await waitFor(() => expect(api.listAttachments).toHaveBeenCalledWith("previous"));
    rerender(<App uuid="new" client={client} />);
    await screen.findByText("Template new");
    resolvePrevious([previous]);
    await waitFor(() => expect(client.getQueryCache().findAll().some((query) => Array.isArray(query.state.data) && query.state.data.includes(previous))).toBe(true));
    expect(screen.getByTestId("sections")).toBeEmptyDOMElement();
    expect(screen.getByTestId("selection")).toHaveTextContent("template");
  });
});


it("resets mounted forms and selection when kind changes even with an identical UUID", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { rerender } = render(<App kind="certificate" uuid="previous" client={client} />);
  await screen.findByText("Template previous");
  fireEvent.click(screen.getByText("Select previous"));
  fireEvent.change(screen.getByLabelText("Local draft"), { target: { value: "COF-only draft" } });
  rerender(<App kind="exam" uuid="previous" client={client} />);
  expect(screen.getByTestId("selection")).toHaveTextContent("template");
  expect(screen.getByLabelText("Local draft")).toHaveValue("");
  await screen.findByText("Template previous");
  expect(client.getQueryCache().findAll().some((query) => query.queryKey[1] === "exam")).toBe(true);
});
