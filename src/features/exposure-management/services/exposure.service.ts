import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import type {
  ControlHierarchy,
  ExposureAgent,
  ExposureAssessment,
  ExposureControl,
  ExposureDashboard,
  ExposureEvent,
  ExposureGroup,
  ExposureInstrument,
  ExposureLimit,
  ExposureMeasurement,
  ExposureMeta,
  ExposurePlan,
  ExposureReport,
  GroupInput,
  GroupMember,
  ImportResult,
  LimitBasis,
  MeasurementInput,
  ReferencePack,
  SeedResult,
  SeriesResponse,
  WorkerProfile,
} from "@/features/exposure-management/exposure.types";
import { bffRequest } from "@/lib/bff-client";

const BASE = BFF_OCCUPATIONAL_HEALTH_ROUTES.ohExposure;

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

const get = <T>(path: string) => bffRequest<T>(`${BASE}/${path}`);
const send = <T>(method: "POST" | "PATCH" | "PUT" | "DELETE", path: string, body: object = {}) =>
  bffRequest<T>(`${BASE}/${path}`, { method, body });

export const exposureKeys = {
  all: ["exposure"] as const,
  meta: ["exposure", "meta"] as const,
  dashboard: ["exposure", "dashboard"] as const,
  agents: ["exposure", "agents"] as const,
  groups: ["exposure", "groups"] as const,
  group: (uuid: string) => ["exposure", "group", uuid] as const,
  series: (group: string, agent: string) => ["exposure", "series", group, agent] as const,
  measurements: ["exposure", "measurements"] as const,
  events: ["exposure", "events"] as const,
  event: (uuid: string) => ["exposure", "event", uuid] as const,
  plans: ["exposure", "plans"] as const,
  instruments: ["exposure", "instruments"] as const,
  assessments: ["exposure", "assessments"] as const,
  report: (from?: string, to?: string) => ["exposure", "report", from ?? "", to ?? ""] as const,
  worker: (customer: string) => ["exposure", "worker", customer] as const,
  eventForIod: (iod: string) => ["exposure", "event-for-iod", iod] as const,
};

// ---- reads
export const fetchExposureMeta = () => get<ExposureMeta>("meta");
export const fetchExposureDashboard = () => get<ExposureDashboard>("dashboard");
export const fetchAgents = (includeInactive = false) => get<ExposureAgent[]>(`agents${qs({ include_inactive: includeInactive })}`);
export const fetchReferenceLimits = () => get<{ disclaimer: string; packs: ReferencePack[] }>("reference-limits");
export const fetchGroups = (withAgents = false) => get<ExposureGroup[]>(`groups${qs({ with_agents: withAgents })}`);
export const fetchGroup = (uuid: string) => get<ExposureGroup>(`groups/${uuid}`);
export const fetchGroupMembers = (uuid: string) => get<GroupMember[]>(`groups/${uuid}/members`);
export const fetchSeries = (groupUuid: string, agentUuid: string) => get<SeriesResponse>(`groups/${groupUuid}/series${qs({ agent_uuid: agentUuid })}`);
export const fetchMeasurements = (filters: { group_uuid?: string; agent_uuid?: string; customer_uuid?: string; status?: string; evaluation?: string; from?: string; to?: string; limit?: number } = {}) =>
  get<ExposureMeasurement[]>(`measurements${qs(filters)}`);
export const fetchAssessments = (filters: { group_uuid?: string; agent_uuid?: string; status?: string } = {}) => get<ExposureAssessment[]>(`assessments${qs(filters)}`);
export const fetchEvents = (filters: { status?: string; severity?: string; group_uuid?: string; agent_uuid?: string; customer_uuid?: string; overdue?: boolean } = {}) =>
  get<ExposureEvent[]>(`events${qs(filters)}`);
export const fetchEvent = (uuid: string) => get<ExposureEvent>(`events/${uuid}`);
export const fetchEventForIod = (iodUuid: string) => get<ExposureEvent | null>(`events/by-iod/${iodUuid}`);
export const fetchPlans = (state?: string) => get<ExposurePlan[]>(`plans${qs({ state })}`);
export const fetchInstruments = () => get<ExposureInstrument[]>("instruments");
export const fetchWorkerExposure = (customerUuid: string) => get<WorkerProfile>(`workers/${customerUuid}`);
export const fetchExposureReport = (from?: string, to?: string) => get<ExposureReport>(`reports${qs({ from, to })}`);
export const exposureReportCsvUrl = (from?: string, to?: string) => `${BASE}/reports/csv${qs({ from, to })}`;

// ---- agents and limits (administrators)
export type AgentInput = { code?: string; name?: string; category?: string; cas_number?: string; molecular_weight?: number | null; default_unit?: string; description?: string; is_active?: boolean };
export type LimitInput = { basis: LimitBasis; value: number; unit: string; averaging_minutes?: number; standard_name?: string; citation?: string; jurisdiction?: string; notes?: string };
export const createAgent = (input: AgentInput) => send<ExposureAgent>("POST", "agents", input);
export const updateAgent = (uuid: string, input: AgentInput) => send<ExposureAgent>("PATCH", `agents/${uuid}`, input);
export const seedReferenceLimits = (keys?: string[]) => send<SeedResult>("POST", "agents/seed-reference", keys ? { keys } : {});
export const addLimit = (agentUuid: string, input: LimitInput) => send<ExposureLimit>("POST", `agents/${agentUuid}/limits`, input);
export const replaceLimit = (limitUuid: string, input: Partial<LimitInput>) => send<ExposureLimit>("PUT", `limits/${limitUuid}`, input);
export const archiveLimit = (limitUuid: string) => send<ExposureLimit>("DELETE", `limits/${limitUuid}`);
export const setAgentComponents = (agentUuid: string, components: string[]) => send<ExposureAgent>("PUT", `agents/${agentUuid}/components`, { components });

// ---- groups, plans, instruments
export const createGroup = (input: GroupInput) => send<ExposureGroup>("POST", "groups", input);
export const updateGroup = (uuid: string, input: GroupInput) => send<ExposureGroup>("PATCH", `groups/${uuid}`, input);
export type GroupAgentInput = { expected_level?: string; controls_summary?: string; restrict_on_exceed?: boolean; notify_email?: string };
export const setGroupAgent = (groupUuid: string, agentUuid: string, input: GroupAgentInput) => send<ExposureGroup>("PUT", `groups/${groupUuid}/agents/${agentUuid}`, input);
export const removeGroupAgent = (groupUuid: string, agentUuid: string) => send<ExposureGroup>("DELETE", `groups/${groupUuid}/agents/${agentUuid}`);
export type PlanInput = { group_uuid?: string; agent_uuid?: string; frequency_months?: number; method?: string; min_samples?: number; next_due_on?: string | null; status?: string; notes?: string };
export const createPlan = (input: PlanInput) => send<ExposurePlan>("POST", "plans", input);
export const updatePlan = (uuid: string, input: PlanInput) => send<ExposurePlan>("PATCH", `plans/${uuid}`, input);
export type InstrumentInput = { name?: string; serial?: string; type?: string; manufacturer?: string; last_calibrated_on?: string | null; calibration_due_on?: string | null; status?: string; certificate_ref?: string };
export const createInstrument = (input: InstrumentInput) => send<ExposureInstrument>("POST", "instruments", input);
export const updateInstrument = (uuid: string, input: InstrumentInput) => send<ExposureInstrument>("PATCH", `instruments/${uuid}`, input);

// ---- results and assessments
export const createMeasurement = (input: MeasurementInput) => send<ExposureMeasurement>("POST", "measurements", input);
export const updateMeasurement = (uuid: string, input: Partial<MeasurementInput>) => send<ExposureMeasurement>("PATCH", `measurements/${uuid}`, input);
export const voidMeasurement = (uuid: string, reason: string) => send<ExposureMeasurement>("POST", `measurements/${uuid}/void`, { reason });
export const previewImport = (csv: string) => send<ImportResult>("POST", "measurements/import/preview", { csv });
export const runImport = (csv: string) => send<ImportResult>("POST", "measurements/import", { csv });
export const recalculateAssessment = (groupUuid: string, agentUuid: string) => send<ExposureAssessment>("POST", `groups/${groupUuid}/assessments/recalculate`, { agent_uuid: agentUuid });
export const updateAssessment = (uuid: string, input: { narrative?: string; controls_adequate?: boolean | null }) => send<ExposureAssessment>("PATCH", `assessments/${uuid}`, input);
export const approveAssessment = (uuid: string, input: { controls_adequate: boolean | null; narrative?: string }) => send<ExposureAssessment>("POST", `assessments/${uuid}/approve`, input);
export const draftAssessmentWithAi = (uuid: string) => send<ExposureAssessment>("POST", `assessments/${uuid}/ai-draft`);

// ---- events
export type EventUpdate = { status?: string; investigation?: string; removal_from_exposure?: boolean; due_on?: string | null };
export const updateEvent = (uuid: string, input: EventUpdate) => send<ExposureEvent>("PATCH", `events/${uuid}`, input);
export const draftEventWithAi = (uuid: string) => send<ExposureEvent>("POST", `events/${uuid}/ai-draft`);
export type ControlInput = { hierarchy: ControlHierarchy; description: string; owner_name?: string; due_on?: string | null };
export const addControl = (eventUuid: string, input: ControlInput) => send<ExposureControl>("POST", `events/${eventUuid}/controls`, input);
export const updateControl = (uuid: string, input: Partial<ControlInput> & { status?: string }) => send<ExposureControl>("PATCH", `controls/${uuid}`, input);
export const openIodFromEvent = (eventUuid: string, input: { customer_uuid?: string; description?: string } = {}) =>
  send<{ iod_case_uuid: string; event: ExposureEvent }>("POST", `events/${eventUuid}/open-iod`, input);

export async function downloadExposureReportCsv(from?: string, to?: string) {
  const response = await fetch(exposureReportCsvUrl(from, to), { method: "GET", credentials: "include" });
  if (!response.ok) {
    throw new Error("Could not export the exposure report.");
  }
  return { blob: await response.blob(), filename: "exposure-report.csv" };
}
