import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { bffRequest } from "@/lib/bff-client";
import type { OhIodApplicability } from "@/features/occupational-health/lib/oh-iod-applicability";

const IOD_APPLICABILITY_URL = "/api/occupational-health/iod-applicability";

function applicabilityFromPayload(payload: {
  cof?: unknown;
  exam?: unknown;
  visit_type_codes?: unknown;
}): OhIodApplicability {
  if (
    typeof payload.cof !== "boolean" ||
    typeof payload.exam !== "boolean" ||
    !Array.isArray(payload.visit_type_codes)
  ) {
    throw new Error("Injury on duty settings were incomplete.");
  }
  return {
    cof: payload.cof,
    exam: payload.exam,
    visit_type_codes: payload.visit_type_codes.filter(
      (code): code is string => typeof code === "string" && code !== "",
    ),
  };
}

export async function fetchOhIodApplicability(): Promise<OhIodApplicability> {
  const payload = await bffRequest<{
    cof?: unknown;
    exam?: unknown;
    visit_type_codes?: unknown;
  }>(IOD_APPLICABILITY_URL);
  return applicabilityFromPayload(payload);
}

export type OhVisitServiceOption = {
  uuid: string;
  code: string;
  name: string;
};

export async function fetchOhVisitServiceOptions(): Promise<OhVisitServiceOption[]> {
  const rows = await bffRequest<Array<{ uuid?: unknown; code?: unknown; name?: unknown }>>(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.visitTypes,
  );
  return rows.flatMap((row) => {
    if (typeof row.uuid !== "string" || typeof row.code !== "string" || typeof row.name !== "string") {
      return [];
    }
    return [{ uuid: row.uuid, code: row.code, name: row.name }];
  });
}

export async function updateOhIodApplicability(
  setting: OhIodApplicability,
): Promise<OhIodApplicability> {
  const payload = await bffRequest<{
    cof?: unknown;
    exam?: unknown;
    visit_type_codes?: unknown;
  }>(IOD_APPLICABILITY_URL, {
    method: "PUT",
    body: setting,
  });
  return applicabilityFromPayload(payload);
}
