import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchIod: vi.fn(),
  record: vi.fn(),
  push: vi.fn(),
  toast: vi.fn(),
  user: { value: null as unknown },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/providers/user-provider", () => ({ useUser: () => ({ userData: mocks.user.value }) }));
vi.mock("@/features/clinical-opd/components/detail/opd-encounter-workspace-context", () => ({
  useOpdEncounterWorkspace: () => ({
    visitUuid: "visit-1",
    encounterUuid: "enc-1",
    encounter: { started_at: "2026-11-12T08:30:00Z" },
  }),
}));
vi.mock("@/features/occupational-health/iod-case/iod-from-visit.service", () => ({
  iodForEncounterKey: (id: string) => ["oh-iod-for-encounter", id],
  fetchIodForEncounter: (...args: unknown[]) => mocks.fetchIod(...args),
  recordIodFromEncounter: (...args: unknown[]) => mocks.record(...args),
}));

import { OpdEncounterMoreMenu } from "@/features/clinical-opd/components/detail/OpdEncounterMoreMenu";

const ohStaff = { groups: ["OccupationalHealth"], enabled_modules: ["OccupationalHealth"], is_admin: false };
const clinician = { groups: ["Clinical"], enabled_modules: ["OccupationalHealth", "Clinical"], is_admin: false };
const noModule = { groups: ["Clinical"], enabled_modules: ["Clinical"], is_admin: false };

function renderMenu() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OpdEncounterMoreMenu />
    </QueryClientProvider>,
  );
}

async function openMenu() {
  const trigger = await screen.findByRole("button", { name: "More actions" });
  fireEvent.keyDown(trigger, { key: "Enter" });
  return screen.findByRole("menu");
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetchIod.mockResolvedValue(null);
  mocks.record.mockResolvedValue({ uuid: "case-1", status: "open" });
});
afterEach(cleanup);

describe("OPD encounter ⋮ menu", () => {
  it("is hidden when the tenant does not have the Occupational Health module", () => {
    mocks.user.value = noModule;
    renderMenu();

    expect(screen.queryByRole("button", { name: "More actions" })).toBeNull();
    expect(mocks.fetchIod).not.toHaveBeenCalled();
  });

  it("offers Record injury on duty to any clinician in a tenant with the module", async () => {
    mocks.user.value = clinician;
    renderMenu();

    const menu = await openMenu();

    expect(within(menu).getByRole("menuitem", { name: "Record injury on duty" })).toBeTruthy();
    expect(mocks.fetchIod).toHaveBeenCalledWith("enc-1");
  });

  it("records the injury with the date and note, then opens the case for OH staff", async () => {
    mocks.user.value = ohStaff;
    renderMenu();

    fireEvent.click(within(await openMenu()).getByRole("menuitem", { name: "Record injury on duty" }));
    const dialog = await screen.findByRole("dialog");
    expect((within(dialog).getByLabelText(/Incident date/) as HTMLInputElement).value).toBe("2026-11-12");
    fireEvent.change(within(dialog).getByLabelText("What happened (optional)"), { target: { value: "Hand caught in a press" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Record injury on duty" }));

    await waitFor(() =>
      expect(mocks.record).toHaveBeenCalledWith({
        visit_uuid: "visit-1",
        encounter_uuid: "enc-1",
        onset_date: "2026-11-12",
        note: "Hand caught in a press",
      }),
    );
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/occupational-health/records/iod/case-1"));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "success", title: "Injury on duty recorded" }));
  });

  it("keeps a clinician without OH access on the visit after recording", async () => {
    mocks.user.value = clinician;
    renderMenu();

    fireEvent.click(within(await openMenu()).getByRole("menuitem", { name: "Record injury on duty" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Record injury on duty" }));

    await waitFor(() => expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({ note: undefined })));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "success" })));
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("shows the server's reason when recording fails", async () => {
    mocks.user.value = clinician;
    mocks.record.mockRejectedValue(new Error("boom"));
    renderMenu();

    fireEvent.click(within(await openMenu()).getByRole("menuitem", { name: "Record injury on duty" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Record injury on duty" }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "error", title: "Could not record the injury on duty" })));
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("links to the case for OH staff once an injury has been recorded", async () => {
    mocks.user.value = ohStaff;
    mocks.fetchIod.mockResolvedValue({ uuid: "case-9", status: "open", ai_status: "" });
    renderMenu();

    const menu = await openMenu();

    expect(within(menu).queryByRole("menuitem", { name: "Record injury on duty" })).toBeNull();
    const link = await within(menu).findByRole("menuitem", { name: "View IOD case" });
    expect(link.getAttribute("href")).toBe("/occupational-health/records/iod/case-9");
  });

  it("tells other clinicians an injury was recorded, without a link they cannot open", async () => {
    mocks.user.value = clinician;
    mocks.fetchIod.mockResolvedValue({ uuid: "case-9", status: "open", ai_status: "" });
    renderMenu();

    const menu = await openMenu();

    const item = await within(menu).findByRole("menuitem", { name: "Injury on duty recorded" });
    expect(item.getAttribute("aria-disabled")).toBe("true");
    expect(within(menu).queryByRole("menuitem", { name: "View IOD case" })).toBeNull();
  });
});
