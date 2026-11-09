"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Customer } from "@/features/customers/types/customer.types";
import type { EmploymentEpisode, OhEmployer, OhHazardProfile } from "@/features/occupational-health/types";

export type OhEmployeeNameMaps = {
  employers: Map<number, string>;
  jobs: Map<number, string>;
  profiles: Map<number, string>;
};

export type OhEmployeeDetailValue = {
  customer: Customer;
  episodes: EmploymentEpisode[];
  names: OhEmployeeNameMaps;
  activeEpisode: EmploymentEpisode | null;
  employer: OhEmployer | null;
  profile: OhHazardProfile | null;
};

const OhEmployeeDetailContext = createContext<OhEmployeeDetailValue | null>(null);

export function OhEmployeeDetailProvider({
  value,
  children,
}: {
  value: OhEmployeeDetailValue;
  children: ReactNode;
}) {
  return <OhEmployeeDetailContext.Provider value={value}>{children}</OhEmployeeDetailContext.Provider>;
}

export function useOhEmployeeDetail(): OhEmployeeDetailValue {
  const value = useContext(OhEmployeeDetailContext);
  if (!value) {
    throw new Error("Employee details are only available inside the employee page.");
  }
  return value;
}
