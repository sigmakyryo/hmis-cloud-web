import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const createTheatreCase = vi.fn().mockResolvedValue({ uuid: "case-1" });

vi.mock("@/features/clinical-ipd/services/clinical-ipd.service", () => ({
  fetchIpdStays: vi.fn().mockResolvedValue([
    { uuid: "stay-1", visit_uuid: "visit-1", clinic_uuid: "clinic-1" },
  ]),
}));

vi.mock("@/features/clinical-theatre/services/clinical-theatre.service", () => ({
  createTheatreCase: (payload: unknown) => createTheatreCase(payload),
  fetchTheatreCases: vi.fn().mockResolvedValue([
    {
      uuid: "case-0",
      status: "booked",
      source: "ipd_stay",
      urgency: "elective",
      scheduled_start: "2026-11-12T08:00:00Z",
      scheduled_end: null,
      procedure_description: "Laparotomy",
      room: { uuid: "room-1", name: "OT 1", code: "OT1", kind: "major" },
      visit_uuid: "visit-1",
      encounter_uuid: null,
      lead_surgeon_name: "",
      allowed_transitions: ["waiting"],
    },
  ]),
  fetchTheatreRooms: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/clinical-theatre/components/TheatreRoomSelect", () => ({
  TheatreRoomSelect: ({
    onChange,
  }: {
    onChange: (room: { uuid: string; name: string; code: string }) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange({ uuid: "room-1", name: "OT 1", code: "OT1" })}
    >
      Pick OT 1
    </button>
  ),
}));

import { IpdTheatreTabPanel } from "@/features/clinical-ipd/components/IpdTheatreTabPanel";

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <IpdTheatreTabPanel visitUuid="visit-1" encounterUuid="enc-1" isActive />
    </QueryClientProvider>,
  );
}

describe("IPD theatre tab", () => {
  it("lists existing theatre cases for the stay", async () => {
    renderPanel();
    expect(await screen.findByText("Laparotomy")).toBeTruthy();
    expect(screen.getByText("Booked")).toBeTruthy();
  });

  it("books the stay into the theatre module with the picked room", async () => {
    renderPanel();
    fireEvent.click(await screen.findByText("Pick OT 1"));
    fireEvent.change(screen.getByLabelText("Start"), {
      target: { value: "2026-11-20T09:00" },
    });
    fireEvent.change(screen.getByLabelText("Procedure description"), {
      target: { value: "Appendicectomy" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Book theatre" }));

    await waitFor(() => expect(createTheatreCase).toHaveBeenCalledTimes(1));
    const payload = createTheatreCase.mock.calls[0][0];
    expect(payload).toMatchObject({
      source: "ipd_stay",
      stay: "stay-1",
      room: "room-1",
      urgency: "elective",
      procedure_description: "Appendicectomy",
    });
    expect(typeof payload.scheduled_start).toBe("string");
  });
});
