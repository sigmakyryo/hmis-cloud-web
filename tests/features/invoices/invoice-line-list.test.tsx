import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InvoiceLineList } from "@/features/invoices/components/detail/InvoiceLineList";
import type { Invoice } from "@/features/invoices/types/invoice.types";

afterEach(() => {
  cleanup();
});

const invoice = {
  id: 81,
  uuid: "c356dab6-4349-408b-bc23-dd98d08b9dbf",
  name: "INV/2026/0001",
  amount_total: "15000",
  lines: [
    {
      id: 11,
      name: "Consultation",
      product_name: "Consultation",
      quantity: "1",
      price_unit: "15000",
      price_total: "15000",
      tariff_code: "CONS-01",
      is_payable: true,
    },
  ],
} as unknown as Invoice;

describe("InvoiceLineList", () => {
  it("renders line items as a table", () => {
    render(<InvoiceLineList invoice={invoice} onViewDetails={vi.fn()} />);

    expect(screen.getByTestId("invoice-lines-list")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Item" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Tariff" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Qty" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Price" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Total" })).toBeInTheDocument();
    expect(screen.getByText("Consultation")).toBeInTheDocument();
    expect(screen.getByText("CONS-01")).toBeInTheDocument();
    expect(screen.getAllByText("15,000.00 MWK").length).toBeGreaterThan(0);
  });

  it("does not show insurer or client columns when a line has a payment split", () => {
    render(
      <InvoiceLineList
        invoice={
          {
            ...invoice,
            insurance_company: "MASM",
            lines: [
              {
                ...invoice.lines![0],
                insurer_due: "10000",
                client_due: "5000",
              },
            ],
          } as Invoice
        }
        onViewDetails={vi.fn()}
      />,
    );

    expect(screen.queryByRole("columnheader", { name: "Insurer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Client" })).not.toBeInTheDocument();
    expect(screen.queryByText("10,000.00")).not.toBeInTheDocument();
    expect(screen.queryByText("5,000.00")).not.toBeInTheDocument();
  });

  it("renders subtle red payer advisories under the line name", () => {
    render(
      <InvoiceLineList
        invoice={
          {
            ...invoice,
            lines: [
              {
                ...invoice.lines![0],
                payer_advisories: [
                  {
                    code: "requires_preauthorization",
                    message: "Pre-authorisation required",
                  },
                ],
              },
            ],
          } as Invoice
        }
        onViewDetails={vi.fn()}
      />,
    );

    expect(screen.getByTestId("invoice-line-advisories-11")).toHaveTextContent(
      "Pre-authorisation required",
    );
  });

  it("omits advisory text when payer_advisories are empty", () => {
    render(
      <InvoiceLineList
        invoice={
          {
            ...invoice,
            lines: [
              {
                ...invoice.lines![0],
                payer_advisories: [],
              },
            ],
          } as Invoice
        }
        onViewDetails={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("invoice-line-advisories-11")).not.toBeInTheDocument();
  });
});
