import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  TheatreBaby,
  TheatreCase,
  TheatreObstetricPayload,
  TheatreReportSummary,
} from "@/features/clinical-theatre/types/clinical-theatre.types";

function baby(overrides: Partial<TheatreBaby> = {}): TheatreBaby {
  return {
    uuid: "baby-1",
    birth_order: 1,
    time_of_birth: "2026-11-12T02:14:00Z",
    sex: "female",
    sex_label: "Female",
    outcome: "live_birth",
    outcome_label: "Live birth",
    birth_weight_g: 3150,
    apgar_1: 7,
    apgar_5: 9,
    apgar_10: null,
    resuscitation: false,
    resuscitation_notes: "",
    destination: "with_mother",
    notes: "",
    newborn_uuid: null,
    newborn_name: "",
    newborn_identifier: "",
    newborn_stay_uuid: null,
    registered_at: null,
    registered_by_name: "",
    ...overrides,
  };
}

const OBSTETRIC: TheatreObstetricPayload = {
  record: {
    uuid: "rec-1",
    caesarean_category: "1",
    caesarean_category_label: "Category 1 - immediate threat to life",
    indication: "Cord prolapse",
    gestation_weeks: 38,
    gestation_days: 2,
    gravida: 2,
    para: 1,
    previous_caesareans: 1,
    decision_to_delivery_minutes: 22,
    uterine_incision: "lower_segment",
    placenta: "complete",
    estimated_blood_loss_ml: 700,
    complications: "",
    notes: "",
    updated_by_name: "Dr Banda",
    updated_at: "2026-11-12T03:00:00Z",
  },
  babies: [
    baby(),
    baby({
      uuid: "baby-2",
      birth_order: 2,
      sex: "male",
      sex_label: "Male",
      birth_weight_g: 2100,
      apgar_5: 5,
      newborn_uuid: "cust-9",
      newborn_name: "Baby Banda",
      newborn_identifier: "P-0009",
    }),
  ],
};

const fetchTheatreObstetric = vi.fn().mockResolvedValue(OBSTETRIC);
const updateTheatreObstetric = vi.fn().mockResolvedValue(OBSTETRIC);
const addTheatreBaby = vi.fn().mockResolvedValue(OBSTETRIC);
const updateTheatreBaby = vi.fn().mockResolvedValue(OBSTETRIC);
const removeTheatreBaby = vi.fn().mockResolvedValue(OBSTETRIC);
const registerTheatreNewborn = vi.fn().mockResolvedValue(OBSTETRIC);
const convertTheatreCaseToIpd = vi.fn().mockResolvedValue({});

vi.mock("@/features/clinical-theatre/services/clinical-theatre.service", () => ({
  fetchTheatreObstetric: (...args: unknown[]) => fetchTheatreObstetric(...args),
  updateTheatreObstetric: (...args: unknown[]) => updateTheatreObstetric(...args),
  addTheatreBaby: (...args: unknown[]) => addTheatreBaby(...args),
  updateTheatreBaby: (...args: unknown[]) => updateTheatreBaby(...args),
  removeTheatreBaby: (...args: unknown[]) => removeTheatreBaby(...args),
  registerTheatreNewborn: (...args: unknown[]) => registerTheatreNewborn(...args),
  convertTheatreCaseToIpd: (...args: unknown[]) => convertTheatreCaseToIpd(...args),
}));

vi.mock("@/features/clinical-ipd/services/clinical-ipd.service", () => ({
  fetchIpdWards: vi.fn().mockResolvedValue([]),
  fetchIpdBeds: vi.fn().mockResolvedValue([]),
}));

import {
  BFF_CLINICAL_THEATRE_ROUTES,
  CLINICAL_THEATRE_API_PATHS,
} from "@/constants/clinical-theatre-api";
import { TheatreBabyForm } from "@/features/clinical-theatre/components/TheatreBabyForm";
import { TheatreIpdConversionPanel } from "@/features/clinical-theatre/components/TheatreIpdConversionPanel";
import { TheatreObstetricPanel } from "@/features/clinical-theatre/components/TheatreObstetricPanel";
import { TheatreReportBody } from "@/features/clinical-theatre/pages/TheatreReportsPage";
import {
  apgarTone,
  babyFormError,
  canAdmitBaby,
  canConvertToIpd,
  canRecordBabies,
  canRegisterBaby,
  conversionSummary,
  formatApgar,
  formatBirthWeight,
  isLowBirthWeight,
  isObstetricEligible,
} from "@/features/clinical-theatre/utils/theatre-obstetric-display";
import { THEATRE_INTRA_OP_SECTIONS } from "@/features/clinical-theatre/utils/theatre-workflow";

afterEach(() => cleanup());
beforeEach(() => vi.clearAllMocks());

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

function makeCase(overrides: Partial<TheatreCase> = {}): TheatreCase {
  return {
    uuid: "case-1",
    status: "in_theatre",
    status_label: "In theatre",
    source: "elective",
    urgency: "emergency",
    clinic_uuid: "clinic-1",
    procedure_description: "Lower segment caesarean section",
    customer_uuid: "cust-1",
    customer_name: "Mary Banda",
    customer_gender: "Female",
    stay_uuid: null,
    converted_to_ipd_at: null,
    converted_from_source: "",
    conversion_reason: "",
    ...overrides,
  } as TheatreCase;
}

describe("theatre advanced C: paths and helpers", () => {
  it("routes obstetric, baby and conversion endpoints", () => {
    expect(CLINICAL_THEATRE_API_PATHS.obstetric("c")).toBe("/theatre/cases/c/obstetric/");
    expect(CLINICAL_THEATRE_API_PATHS.babyRegister("c", "b")).toBe(
      "/theatre/cases/c/babies/b/register/",
    );
    expect(CLINICAL_THEATRE_API_PATHS.convertToIpd("c")).toBe(
      "/theatre/cases/c/convert-to-ipd/",
    );
    expect(BFF_CLINICAL_THEATRE_ROUTES.baby("c", "b")).toBe("/api/theatre/cases/c/babies/b");
  });

  it("adds a caesarean intra-op section", () => {
    expect(THEATRE_INTRA_OP_SECTIONS.map((section) => section.id)).toContain("caesarean");
  });

  it("grades Apgar and birth weight like the API", () => {
    expect(apgarTone(9)).toBe("normal");
    expect(apgarTone(5)).toBe("moderate");
    expect(apgarTone(2)).toBe("low");
    expect(apgarTone(null)).toBeNull();
    expect(isLowBirthWeight(2499)).toBe(true);
    expect(isLowBirthWeight(2500)).toBe(false);
    expect(formatBirthWeight(3150)).toBe("3.15 kg");
    expect(formatApgar(baby())).toBe("7 / 9 / –");
  });

  it("validates baby values", () => {
    const empty = { birth_weight_g: null, apgar_1: null, apgar_5: null, apgar_10: null };
    expect(babyFormError(empty)).toBeNull();
    expect(babyFormError({ ...empty, apgar_5: 11 })).toMatch(/Apgar/);
    expect(babyFormError({ ...empty, birth_weight_g: 9000 })).toMatch(/weight/);
  });

  it("decides who can be registered, admitted and converted", () => {
    expect(canRegisterBaby(baby())).toBe(true);
    expect(canRegisterBaby(baby({ newborn_uuid: "x" }))).toBe(false);
    expect(canRegisterBaby(baby({ outcome: "fresh_stillbirth" }))).toBe(false);
    expect(canAdmitBaby(baby({ outcome: "early_neonatal_death" }))).toBe(false);
    expect(canRecordBabies("booked")).toBe(false);
    expect(canRecordBabies("recovery")).toBe(true);
    expect(isObstetricEligible(makeCase({ customer_gender: "Male" }))).toBe(false);
    expect(canConvertToIpd(makeCase())).toBe(true);
    expect(canConvertToIpd(makeCase({ source: "ipd_stay", stay_uuid: "s" }))).toBe(false);
    expect(canConvertToIpd(makeCase({ status: "discharged_home" }))).toBe(false);
    expect(
      conversionSummary(
        makeCase({
          converted_to_ipd_at: "2026-11-12T05:00:00Z",
          converted_from_source: "elective",
          conversion_reason: "Bleeding",
        }),
      ),
    ).toMatch(/^Converted from day case to inpatient on .*: Bleeding$/);
    expect(conversionSummary(makeCase())).toBeNull();
  });
});

describe("theatre advanced C: components", () => {
  it("lists babies with registration state and actions", async () => {
    wrap(<TheatreObstetricPanel theatreCase={makeCase()} canRecord canRegister />);
    expect(await screen.findByText(/Baby 1 · Female/)).toBeInTheDocument();
    expect(screen.getByText(/Registered as Baby Banda \(P-0009\)/)).toBeInTheDocument();
    expect(screen.getByText(/low birth weight/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Register newborn" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Admit baby" })).toBeInTheDocument();
    // The registered baby cannot be removed.
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(1);
    expect(screen.getByDisplayValue("Cord prolapse")).toBeInTheDocument();
  });

  it("registers a newborn with the chosen names", async () => {
    wrap(<TheatreObstetricPanel theatreCase={makeCase()} canRecord canRegister />);
    fireEvent.click(await screen.findByRole("button", { name: "Register newborn" }));
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Grace" } });
    expect(screen.getByLabelText("Surname")).toHaveValue("Banda");
    fireEvent.click(screen.getByRole("button", { name: "Register newborn" }));
    await waitFor(() =>
      expect(registerTheatreNewborn).toHaveBeenCalledWith("case-1", "baby-1", {
        first_name: "Grace",
        last_name: "Banda",
        bed: null,
      }),
    );
  });

  it("saves the caesarean record", async () => {
    wrap(<TheatreObstetricPanel theatreCase={makeCase()} canRecord canRegister={false} />);
    await screen.findByDisplayValue("Cord prolapse");
    fireEvent.change(screen.getByLabelText("Blood loss (ml)"), { target: { value: "900" } });
    fireEvent.click(screen.getByRole("button", { name: "Save caesarean details" }));
    await waitFor(() => expect(updateTheatreObstetric).toHaveBeenCalled());
    const [caseUuid, payload] = updateTheatreObstetric.mock.calls[0];
    expect(caseUuid).toBe("case-1");
    expect(payload).toMatchObject({
      caesarean_category: "1",
      estimated_blood_loss_ml: 900,
      gestation_weeks: 38,
      uterine_incision: "lower_segment",
    });
    expect(screen.queryByRole("button", { name: "Register newborn" })).toBeNull();
  });

  it("hides the panel content for male patients", () => {
    wrap(
      <TheatreObstetricPanel
        theatreCase={makeCase({ customer_gender: "Male" })}
        canRecord
        canRegister
      />,
    );
    expect(screen.getByText(/female patients only/)).toBeInTheDocument();
    expect(fetchTheatreObstetric).not.toHaveBeenCalled();
  });

  it("adds a baby with Apgar scores and validates sex", async () => {
    const onDone = vi.fn();
    wrap(<TheatreBabyForm caseUuid="case-1" onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: "Add baby" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Choose the baby's sex.");
    expect(addTheatreBaby).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Sex"), { target: { value: "male" } });
    fireEvent.change(screen.getByLabelText("Birth weight (g)"), { target: { value: "3400" } });
    fireEvent.change(screen.getByLabelText("Apgar 1 min"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Apgar 5 min"), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: "Add baby" }));
    await waitFor(() => expect(addTheatreBaby).toHaveBeenCalled());
    const [caseUuid, payload] = addTheatreBaby.mock.calls[0];
    expect(caseUuid).toBe("case-1");
    expect(payload).toMatchObject({
      sex: "male",
      outcome: "live_birth",
      birth_weight_g: 3400,
      apgar_1: 8,
      apgar_5: 9,
      apgar_10: null,
      resuscitation: false,
    });
    expect(typeof payload.time_of_birth).toBe("string");
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("offers day-case conversion and requires a bed", async () => {
    wrap(<TheatreIpdConversionPanel theatreCase={makeCase()} canConvert />);
    fireEvent.click(screen.getByRole("button", { name: "Convert to inpatient" }));
    fireEvent.change(screen.getByLabelText("Reason for admission"), {
      target: { value: "Bleeding" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Admit to ward" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Choose a ward bed.");
    expect(convertTheatreCaseToIpd).not.toHaveBeenCalled();
  });

  it("shows the conversion once done and hides the action", () => {
    wrap(
      <TheatreIpdConversionPanel
        theatreCase={makeCase({
          source: "ipd_stay",
          stay_uuid: "stay-1",
          converted_to_ipd_at: "2026-11-12T05:00:00Z",
          converted_from_source: "elective",
          conversion_reason: "Bleeding",
        })}
        canConvert
      />,
    );
    expect(screen.getByText(/Converted from day case to inpatient/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Convert to inpatient" })).toBeNull();
  });

  it("hides conversion without the capability", () => {
    wrap(<TheatreIpdConversionPanel theatreCase={makeCase()} canConvert={false} />);
    expect(screen.queryByRole("button", { name: "Convert to inpatient" })).toBeNull();
  });

  it("reports caesareans, births and conversions", () => {
    const report = {
      date_from: "2026-11-01",
      date_to: "2026-11-12",
      days: 12,
      session_hours: 8,
      totals: {
        cases: 4,
        completed: 4,
        cancelled: 0,
        postponed: 0,
        in_progress: 0,
        operating_minutes: 240,
        average_case_minutes: 60,
      },
      by_status: [],
      by_urgency: [],
      by_room: [],
      by_surgeon: [],
      cancellations: [],
      obstetrics: {
        caesareans: 3,
        by_category: [{ category: "1", label: "Category 1 - immediate threat to life", cases: 2 }],
        babies: 4,
        live_births: 3,
        stillbirths: 1,
        low_apgar_5: 1,
        low_birth_weight: 2,
        registered_newborns: 2,
        unregistered_live_births: 1,
      },
      ipd_conversions: {
        converted: 1,
        day_cases: 4,
        rate: 0.25,
        cases: [
          {
            case_uuid: "c1",
            procedure_description: "Hernia repair",
            customer_name: "Ada Patient",
            converted_at: "2026-11-10T10:00:00Z",
            reason: "Slow recovery",
          },
        ],
      },
    } as TheatreReportSummary;
    wrap(<TheatreReportBody report={report} />);
    expect(screen.getByText("Caesareans & births")).toBeInTheDocument();
    expect(screen.getByText("Category 1 - immediate threat to life")).toBeInTheDocument();
    expect(screen.getByText(/1 live birth\(s\) not yet registered/)).toBeInTheDocument();
    expect(screen.getByText(/Day cases converted to inpatient \(1 of 4, 25.0%\)/)).toBeInTheDocument();
    expect(screen.getByText("Slow recovery")).toBeInTheDocument();
  });
});
