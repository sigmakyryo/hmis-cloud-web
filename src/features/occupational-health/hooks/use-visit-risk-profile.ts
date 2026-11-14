import { useQuery } from "@tanstack/react-query";

import { fetchOhHazardProfiles } from "@/features/occupational-health/services/oh.service";
import { resolveActiveRiskProfileEpisode } from "@/features/occupational-health/utils/customer-has-risk-profile";
import type { EmploymentEpisode } from "@/features/occupational-health/types";

export function useVisitRiskProfile(episodes: EmploymentEpisode[], enabled: boolean) {
  const episode = resolveActiveRiskProfileEpisode(episodes);
  const employer = episode?.employer;
  const query = useQuery({
    queryKey: ["oh-hazard-profiles", employer ?? "none"],
    queryFn: () => fetchOhHazardProfiles(employer),
    enabled: enabled && Boolean(employer),
    retry: false,
    refetchOnMount: "always",
  });
  return {
    query,
    profile: query.data?.find((row) => row.id === episode?.hazard_profile) ?? null,
  };
}
