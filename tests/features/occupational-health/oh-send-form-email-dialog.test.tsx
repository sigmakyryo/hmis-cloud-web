import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SendFormEmailDialog } from "@/features/occupational-health/components/SendFormEmailDialog";
import { publicAppOrigin } from "@/lib/server/public-app-origin";

const mocks = vi.hoisted(() => ({
  recipient: vi.fn(),
  invite: vi.fn(),
}));

vi.mock("@/features/occupational-health/services/oh.service", () => ({
  fetchOhEmployeeFormInviteRecipient: mocks.recipient,
  createOhEmployeeFormInvite: mocks.invite,
}));

afterEach(() => {
  cleanup();
  mocks.recipient.mockReset();
  mocks.invite.mockReset();
});

function renderDialog(onSent = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SendFormEmailDialog open onOpenChange={vi.fn()} resolveFormUuid={async () => "form-1"} onSent={onSent} />
    </QueryClientProvider>,
  );
  return onSent;
}

describe("SendFormEmailDialog", () => {
  it("shows the worker email on record before sending and sends to it", async () => {
    mocks.recipient.mockResolvedValue({ email: "thandi@example.test", name: "Thandi Banda", source: "employee_record", reason: null });
    mocks.invite.mockResolvedValue({ token: "tok", expires_at: "", sent_to: "thandi@example.test" });
    const onSent = renderDialog();

    expect(await screen.findByTestId("oh-send-form-email-recipient")).toHaveTextContent("Thandi Banda · thandi@example.test");
    expect(screen.getByText("Email on the employee's record")).toBeInTheDocument();
    expect(mocks.invite).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("oh-send-form-email-confirm"));
    await waitFor(() => expect(onSent).toHaveBeenCalledWith({ token: "tok", sentTo: "thandi@example.test" }));
    expect(mocks.recipient).toHaveBeenCalledWith("form-1");
    expect(mocks.invite).toHaveBeenCalledWith("form-1", true);
  });

  it("blocks sending when the worker has no email on file", async () => {
    mocks.recipient.mockResolvedValue({ email: null, name: "No Mail", source: null, reason: "Add a valid email address to the employee record before sending." });
    renderDialog();

    expect(await screen.findByTestId("oh-send-form-email-problem")).toHaveTextContent("Add a valid email address");
    expect(screen.getByTestId("oh-send-form-email-confirm")).toBeDisabled();
  });
});

describe("publicAppOrigin", () => {
  it("uses the request origin", () => {
    expect(publicAppOrigin(new Request("http://app.localhost:3000/api/x"))).toBe("http://app.localhost:3000");
  });

  it("honours proxy forwarded host and proto", () => {
    const request = new Request("http://internal:3000/api/x", {
      headers: { "x-forwarded-host": "clinic.sigmahmis.com", "x-forwarded-proto": "https" },
    });
    expect(publicAppOrigin(request)).toBe("https://clinic.sigmahmis.com");
  });
});
