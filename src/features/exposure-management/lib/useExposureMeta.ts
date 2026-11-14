import { useQuery } from "@tanstack/react-query";

import { exposureKeys, fetchExposureMeta } from "@/features/exposure-management/services/exposure.service";

export function useExposureMeta() {
  return useQuery({ queryKey: exposureKeys.meta, queryFn: fetchExposureMeta, staleTime: 5 * 60_000 });
}
