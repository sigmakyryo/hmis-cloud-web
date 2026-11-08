import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useTemplateAiQueue } from "@/features/oh-template-builder/hooks/useTemplateAiQueue";
const api = vi.hoisted(() => ({ apply: vi.fn() }));
vi.mock("@/features/oh-template-builder/lib/templateAi", () => ({ applyCofTemplateAiOperations: api.apply }));
function Session({ uuid }: { uuid: string }) {
  const { enqueue, note } = useTemplateAiQueue(uuid);
  return <><button onClick={() => enqueue({ type: "create_section", name: "Section", code: "SECTION" })}>Enqueue</button><p data-testid="note">{note}</p></>;
}
afterEach(cleanup);
it("does not execute queued old operations or display old errors in the next template", async () => {
  api.apply.mockReset();
  let finishOld!: (value: { applied: never[]; errors: string[] }) => void;
  api.apply.mockImplementation((uuid: string) => uuid === "old" ? new Promise((resolve) => { finishOld = resolve; }) : Promise.resolve({ applied: [], errors: [] }));
  const { rerender } = render(<Session key="old" uuid="old" />);
  fireEvent.click(screen.getByText("Enqueue"));
  fireEvent.click(screen.getByText("Enqueue"));
  await waitFor(() => expect(api.apply).toHaveBeenCalledTimes(1));
  rerender(<Session key="new" uuid="new" />);
  fireEvent.click(screen.getByText("Enqueue"));
  await waitFor(() => expect(api.apply).toHaveBeenCalledTimes(2));
  await act(async () => { finishOld({ applied: [], errors: ["Old template failure"] }); });
  expect(api.apply.mock.calls.map(([uuid]) => uuid)).toEqual(["old", "new"]);
  expect(screen.getByTestId("note")).toBeEmptyDOMElement();
});
