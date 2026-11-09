import type { AppIconName } from "@/components/icons/app-icon";
import { ROUTES } from "@/constants/routes";

export const OH_EMPLOYEE_DETAIL_TABS = [
  { id: "employment", label: "Employment", segment: null, icon: "building" },
  { id: "forms", label: "Forms", segment: "forms", icon: "file" },
  { id: "immunizations", label: "Immunizations", segment: "immunizations", icon: "shield" },
  { id: "drug-alcohol", label: "Drug & alcohol", segment: "drug-alcohol", icon: "flask" },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  segment: string | null;
  icon: AppIconName;
}>;

export type OhEmployeeDetailTabId = (typeof OH_EMPLOYEE_DETAIL_TABS)[number]["id"];

export function ohEmployeeDetailHref(customerUuid: string, tabId: OhEmployeeDetailTabId): string {
  const tab = OH_EMPLOYEE_DETAIL_TABS.find((item) => item.id === tabId);
  const base = ROUTES.occupationalHealthEmployee(customerUuid);
  return tab?.segment ? `${base}/${tab.segment}` : base;
}

export function ohEmployeeDetailTabFromPathname(pathname: string, customerUuid: string): OhEmployeeDetailTabId {
  const base = ROUTES.occupationalHealthEmployee(customerUuid);
  const rest = pathname.startsWith(`${base}/`) ? pathname.slice(base.length + 1).split("/")[0] : "";
  const match = OH_EMPLOYEE_DETAIL_TABS.find((tab) => tab.segment === rest);
  return match?.id ?? "employment";
}
