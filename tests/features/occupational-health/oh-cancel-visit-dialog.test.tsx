import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { OhCancelVisitDialog } from "@/features/occupational-health/components/OhCancelVisitDialog";

const cancelNativeOhVisit = vi.hoisted(() => vi.fn());

vi.mock("@/providers/toast-provider", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/features/occupational-health/services/native-visit.service", () => ({
  cancelNativeOhVisit: (...args: unknown[]) => cancelNativeOhVisit(...args),
}));

afterEach(() => {
  cleanup();
  cancelNativeOhVisit.mockReset();
});

it("requires a reason and sends the chosen outcome", async () => {
  cancelNativeOhVisit.mockResolvedValue({ uuid: "enc-1", open_billing_lines: 0 });
  const onCancelled = vi.fn();
  render(<OhCancelVisitDialog encounterUuid="enc-1" onCancelled={onCancelled} />);

  fireEvent.click(screen.getByTestId("oh-cancel-visit"));
  const confirm = await screen.findByRole("button", { name: "Confirm" });
  expect(confirm).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: "Did not attend" }));
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Worker did not arrive" } });
  fireEvent.click(confirm);

  await waitFor(() =>
    expect(cancelNativeOhVisit).toHaveBeenCalledWith("enc-1", {
      outcome: "no_show",
      reason: "Worker did not arrive",
    }),
  );
  await waitFor(() => expect(onCancelled).toHaveBeenCalled());
});
