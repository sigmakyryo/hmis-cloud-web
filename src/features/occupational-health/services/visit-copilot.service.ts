import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { bffRequest } from "@/lib/bff-client";

export type CopilotPoint = {
  fact_id: string;
  source: string;
  label: string;
  panel: string;
  text: string;
};

export type CopilotDraft = {
  wording?: string;
  restrictions?: string[];
  clinician_explanation?: string;
  worker_explanation?: string;
  letter?: string;
  whatsapp?: string;
  board_brief?: string;
  clinical_note?: string;
  five_whys?: string[];
  vaccine_code?: string | null;
  status?: string | null;
  doses_received?: number | null;
  doses_required?: number | null;
  next_due_date?: string | null;
  risk_statement?: string | null;
};

export type CopilotResponse = {
  refused: boolean;
  message: string;
  points: CopilotPoint[];
  draft: CopilotDraft;
};

const COPILOT_TIMEOUT_MS = 130_000;

export function fetchVisitBrief(visitUuid: string) {
  return bffRequest<CopilotResponse>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohVisitCopilotBrief(visitUuid), {
    method: "POST",
    body: {},
    timeoutMs: COPILOT_TIMEOUT_MS,
  });
}

export function askVisitCopilot(visitUuid: string, prompt: string) {
  return bffRequest<CopilotResponse>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohVisitCopilotChat(visitUuid), {
    method: "POST",
    body: { prompt },
    timeoutMs: COPILOT_TIMEOUT_MS,
  });
}

export function draftVisitCertificate(visitUuid: string) {
  return bffRequest<CopilotResponse>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohVisitCertificateDraft(visitUuid), {
    method: "POST",
    body: {},
    timeoutMs: COPILOT_TIMEOUT_MS,
  });
}

export function explainCatchUp(customerUuid: string, vaccineCode: string) {
  return bffRequest<CopilotResponse>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmCatchUp(customerUuid), {
    method: "POST",
    body: { vaccine_code: vaccineCode },
    timeoutMs: COPILOT_TIMEOUT_MS,
  });
}

export function draftRecall(payload: {
  customer_uuid: string;
  kind: "overdue" | "non_responder" | "exposure_followup";
  vaccine_code?: string;
}) {
  return bffRequest<CopilotResponse>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmRecallDraft, {
    method: "POST",
    body: payload,
    timeoutMs: COPILOT_TIMEOUT_MS,
  });
}

export function draftBoardBrief(uuid: string) {
  return bffRequest<CopilotResponse>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmBoardBrief(uuid), {
    method: "POST",
    body: {},
    timeoutMs: COPILOT_TIMEOUT_MS,
  });
}

export function draftExposureNote(uuid: string) {
  return bffRequest<CopilotResponse>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmExposureNoteDraft(uuid), {
    method: "POST",
    body: {},
    timeoutMs: COPILOT_TIMEOUT_MS,
  });
}

export function acceptExposureNote(uuid: string, payload: { clinical_note: string; five_whys: string[] }) {
  return bffRequest<{ notes: string; rca_uuid: string | null; five_whys: string[] }>(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmExposureNote(uuid),
    { method: "POST", body: payload },
  );
}
