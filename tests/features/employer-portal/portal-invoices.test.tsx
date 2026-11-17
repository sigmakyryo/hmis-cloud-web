import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PortalInvoicesPage } from "@/app/employer-portal/_components/PortalInvoicesPage";

const portal = vi.hoisted(() => ({
  fetchPortalInvoices: vi.fn(),
  submitPortalPaymentNotice: vi.fn(),
}));

vi.mock("@/features/employer-portal/services/employer-portal.service", () => ({
  INVOICE_STATUS_LABEL: { not_paid: "Not paid", partially_paid: "Part paid", paid: "Paid" },
  fetchPortalInvoices: portal.fetchPortalInvoices,
  submitPortalPaymentNotice: portal.submitPortalPaymentNotice,
  portalInvoicePdfUrl: (uuid: string) => `/api/employer-portal/invoices/${uuid}/pdf`,
}));

const invoice = {
  uuid: "eeeeeeee-0000-4000-8000-0000000000f1",
  number: "INV-1",
  date: "2026-10-01",
  account: "Acme Ltd",
  amount_total: "120.00",
  amount_paid: "0.00",
  amount_due: "120.00",
  payment_status: "not_paid" as const,
  services: ["Medical"],
  payment_notice: null,
};

describe("portal invoices", () => {
  beforeEach(() => {
    portal.fetchPortalInvoices.mockReset();
    portal.submitPortalPaymentNotice.mockReset();
    portal.fetchPortalInvoices.mockResolvedValue([invoice]);
    portal.submitPortalPaymentNotice.mockResolvedValue({ status: "submitted", payment_reference: "BANK-100" });
  });

  it("submits a payment reference and leaves the invoice unpaid", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <PortalInvoicesPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("INV-1")).toBeTruthy();
    expect(screen.getByText("Not paid")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Payment reference for INV-1"), { target: { value: "BANK-100" } });
    fireEvent.click(screen.getByRole("button", { name: "I've paid" }));

    await waitFor(() =>
      expect(portal.submitPortalPaymentNotice).toHaveBeenCalledWith(invoice.uuid, "BANK-100"),
    );
    expect(screen.getByText("Not paid")).toBeTruthy();
  });
});
