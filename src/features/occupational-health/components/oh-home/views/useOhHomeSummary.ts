"use client";

import { useQuery } from "@tanstack/react-query";

import type { OhHomeModuleSlug } from "@/features/occupational-health/lib/oh-home.types";
import { fetchOhHomeSummary, ohHomeKeys } from "@/features/occupational-health/services/oh-home.service";

/** One request per module for the home sections the OH service aggregates. */
export function useOhHomeSummary<M extends OhHomeModuleSlug>(module: M) {
  return useQuery({ queryKey: ohHomeKeys.summary(module), queryFn: () => fetchOhHomeSummary(module), staleTime: 60_000 });
}
