import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { bffRequest } from "@/lib/bff-client";

export type CofTemplateAiField = {
  code?: string;
  label?: string;
  response_type?: string;
  options?: string;
};

export type CofTemplateAiOperation = {
  type: string;
  client_key?: string;
  library_section_uuid?: string;
  attachment_uuid?: string;
  section_uuid?: string;
  section_code?: string;
  name?: string;
  code?: string;
  fields?: CofTemplateAiField[];
};

export type CofTemplateAiChatResponse = {
  conversation_id: string | null;
  assistant_message: string;
  operations: CofTemplateAiOperation[];
  text?: string;
};

export type CofTemplateAiApplyResponse = {
  applied: { type: string; client_key?: string; reused?: boolean; result: unknown }[];
  errors: string[];
};

export async function chatCofTemplateAi(
  templateUuid: string,
  payload: { prompt: string; conversation_id?: string },
) {
  return bffRequest<CofTemplateAiChatResponse>(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.cofTemplateAiChat(templateUuid),
    { method: "POST", body: payload },
  );
}

export async function applyCofTemplateAiOperations(
  templateUuid: string,
  payload: { operations: CofTemplateAiOperation[] },
) {
  return bffRequest<CofTemplateAiApplyResponse>(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.cofTemplateAiApply(templateUuid),
    { method: "POST", body: payload },
  );
}
