import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CustomerPhotoDialog } from "@/features/customers/components/detail/CustomerPhotoDialog";
import type { Customer } from "@/features/customers/types/customer.types";

vi.mock("@/providers/toast-provider", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/features/customers/services/customers.service", () => ({
  uploadCustomerPhoto: vi.fn(),
  clearCustomerPhoto: vi.fn(),
}));

const customer = {
  id: 1,
  uuid: "3077af73-dd86-4163-bf1f-50d6836d624e",
  tenant: 1,
  first_name: "Amina",
  middle_name: null,
  last_name: "Banda",
  full_name: "Amina Banda",
  customer_identifier: "C-1",
  internal_reference: "",
  phone_number: null,
  email: null,
  patient_uuid: "22222222-2222-2222-2222-222222222222",
  gender: "Female",
  dob: "1990-01-01",
  dob_is_estimated: false,
  age: 36,
  has_synced_to_openmrs: false,
  is_active: true,
  visit_status: "none",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  created_by: null,
} as Customer;

function mockCamera(getUserMedia: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CustomerPhotoDialog camera", () => {
  it("opens a live preview after the browser grants the camera", async () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] };
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    mockCamera(getUserMedia);

    render(
      <CustomerPhotoDialog
        customer={customer}
        open
        onOpenChange={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("customer-photo-camera-start"));

    const preview = await screen.findByTestId("customer-photo-camera-preview");
    expect(preview).toHaveClass("-scale-x-100");
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: { facingMode: { ideal: "user" } },
    });
  });

  it("explains how to allow the camera when permission is denied", async () => {
    const getUserMedia = vi
      .fn()
      .mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    mockCamera(getUserMedia);

    render(
      <CustomerPhotoDialog
        customer={customer}
        open
        onOpenChange={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("customer-photo-camera-start"));

    expect(await screen.findByTestId("customer-photo-camera-error")).toHaveTextContent(
      /allow the camera/i,
    );
    await waitFor(() => {
      expect(screen.queryByTestId("customer-photo-camera-preview")).not.toBeInTheDocument();
    });
  });
});
