import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { bffRequest } from "@/lib/bff-client";
import type { OhHomeModuleSlug, OhHomeSummaries } from "@/features/occupational-health/lib/oh-home.types";

export const ohHomeKeys = {
  summary: (module: OhHomeModuleSlug) => ["oh-home", "summary", module] as const,
};

/** The extra sections one module shows on OH home. */
export function fetchOhHomeSummary<M extends OhHomeModuleSlug>(module: M): Promise<OhHomeSummaries[M]> {
  return bffRequest<OhHomeSummaries[M]>(`${BFF_OCCUPATIONAL_HEALTH_ROUTES.ohHome}/${module}`);
}
