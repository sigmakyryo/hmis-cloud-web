import { ROUTES } from "@/constants/routes";

export type OhFormsView = "live" | "archived";
export type OhFormsStatus = "all" | "draft" | "published";
export type OhFormsType = "all" | "employee" | "exam" | "certificate" | "custom";

export type OhFormsListFilters = {
  view: OhFormsView;
  status: OhFormsStatus;
  type: OhFormsType;
  search: string;
};

const TYPES: OhFormsType[] = ["all", "employee", "exam", "certificate", "custom"];

export function parseFormsView(value: string | null | undefined): OhFormsView {
  return value === "archived" ? "archived" : "live";
}

export function parseFormsStatus(value: string | null | undefined): OhFormsStatus {
  return value === "draft" || value === "published" ? value : "all";
}

export function parseFormsType(value: string | null | undefined): OhFormsType {
  return TYPES.includes(value as OhFormsType) ? (value as OhFormsType) : "all";
}

type ParamsLike = { get(name: string): string | null };

export function formsFiltersFromSearchParams(params: ParamsLike | null | undefined): OhFormsListFilters {
  return {
    view: parseFormsView(params?.get("view")),
    status: parseFormsStatus(params?.get("status")),
    type: parseFormsType(params?.get("type")),
    search: params?.get("q") ?? "",
  };
}

/** Live (not archived) is the default and is left out of the URL. */
export function ohFormsHref(filters: Partial<OhFormsListFilters> = {}): string {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.set("q", filters.search.trim());
  if (filters.type && filters.type !== "all") params.set("type", filters.type);
  if (filters.view === "archived") params.set("view", "archived");
  if (filters.view !== "archived" && filters.status && filters.status !== "all") params.set("status", filters.status);
  const query = params.toString();
  return query ? `${ROUTES.occupationalHealthForms}?${query}` : ROUTES.occupationalHealthForms;
}

/** Live = not archived. Within Live, an optional draft/published refinement. */
export function matchesFormsView(
  status: "draft" | "published" | "archived",
  view: OhFormsView,
  refine: OhFormsStatus,
): boolean {
  if (view === "archived") return status === "archived";
  if (status === "archived") return false;
  return refine === "all" || refine === status;
}
