"use client";

import { BellRing, CalendarPlus, Download, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ListPageDataTable,
  ListPageDataTableBody,
  ListPageDataTableCell,
  ListPageDataTableHeader,
  ListPageDataTableHeaderCell,
  ListPageDataTableHeaderRow,
  ListPageDataTableRow,
  ListPagePagination,
  ListPageSearchField,
} from "@/features/app-shell/components/page-layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OhPanelState } from "@/features/occupational-health/components/dashboard/OhPanel";
import { OH_STICKY_TABLE } from "@/features/occupational-health/components/dashboard/oh-flat";
import { OhSortHeader } from "@/features/occupational-health/components/dashboard/OhSortHeader";
import { downloadText, toCsv, useOhTable } from "@/features/occupational-health/components/dashboard/oh-table";
import {
  DUE_FILTER_LABEL,
  formatDate,
  matchesDue,
  relativeDue,
  uniqueSorted,
  type OhDueFilter,
  type OhWorkRow,
} from "@/features/occupational-health/components/surveillance/oh-surveillance-utils";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export type OhWorklistFilters = {
  search: string;
  status: "all" | "overdue" | "due";
  due: OhDueFilter;
  exam: string;
  hazard: string;
  site: string;
};

export const EMPTY_WORKLIST_FILTERS: OhWorklistFilters = { search: "", status: "all", due: "any", exam: "", hazard: "", site: "" };

type SortKey = "due" | "worker" | "exam" | "site";

function sortValue(row: OhWorkRow, key: SortKey) {
  switch (key) {
    case "due":
      return row.days ?? Number.MAX_SAFE_INTEGER;
    case "worker":
      return row.customer_name.toLowerCase();
    case "exam":
      return `${row.component_code} ${row.examLabel}`.toLowerCase();
    case "site":
      return `${row.site} ${row.department_name ?? ""}`.toLowerCase();
  }
}

export function filterWorkRows(rows: OhWorkRow[], f: OhWorklistFilters): OhWorkRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (f.status === "overdue" && !row.overdue) return false;
    if (f.status === "due" && row.overdue) return false;
    if (!matchesDue(row, f.due)) return false;
    if (f.exam && row.component_code !== f.exam) return false;
    if (f.hazard && (row.hazard_profile ?? "") !== f.hazard) return false;
    if (f.site && row.site !== f.site) return false;
    if (!q) return true;
    return [row.customer_name, row.customer_identifier, row.employer, row.job_title, row.component_code, row.department_name, row.site]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  allLabel: string;
  className?: string;
}) {
  return (
    <Select value={value || "__all"} onValueChange={(v) => onChange(v === "__all" ? "" : v)}>
      <SelectTrigger aria-label={label} className={cn("h-8 w-full rounded-lg border-dash-border bg-white text-[13px] sm:w-[150px]", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className={appFont.className}>
        <SelectItem value="__all">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type OhSurveillanceWorklistProps = {
  rows: OhWorkRow[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  filters: OhWorklistFilters;
  onFiltersChange: (filters: OhWorklistFilters) => void;
  onOpenRow: (row: OhWorkRow) => void;
  onSchedule: (row: OhWorkRow) => void;
  onRecall: (rows: OhWorkRow[]) => void;
};

/** Due and overdue surveillance worklist: search, filters, sorting, paging, bulk recall and CSV. */
export function OhSurveillanceWorklist({
  rows,
  isLoading,
  error,
  onRetry,
  filters,
  onFiltersChange,
  onOpenRow,
  onSchedule,
  onRecall,
}: OhSurveillanceWorklistProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const set = (patch: Partial<OhWorklistFilters>) => {
    onFiltersChange({ ...filters, ...patch });
    table.setPage(1);
  };

  const filtered = useMemo(() => filterWorkRows(rows, filters), [rows, filters]);
  const table = useOhTable<OhWorkRow, SortKey>({ rows: filtered, initialSort: { key: "due", dir: "asc" }, sortValue, pageSize: 15 });

  const examOptions = useMemo(() => uniqueSorted(rows.map((r) => r.component_code)).map((v) => ({ value: v, label: v })), [rows]);
  const hazardOptions = useMemo(() => uniqueSorted(rows.map((r) => r.hazard_profile)).map((v) => ({ value: v, label: v })), [rows]);
  const siteOptions = useMemo(() => uniqueSorted(rows.map((r) => r.site)).map((v) => ({ value: v, label: v })), [rows]);

  const activeCount = [filters.status !== "all", filters.due !== "any", filters.exam, filters.hazard, filters.site, filters.search.trim()].filter(Boolean).length;
  const visibleKeys = new Set(filtered.map((r) => r.key));
  const selectedRows = filtered.filter((r) => selected.has(r.key));
  const pageAllSelected = table.pageRows.length > 0 && table.pageRows.every((r) => selected.has(r.key));

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set([...prev].filter((k) => visibleKeys.has(k)));
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function togglePage() {
    setSelected((prev) => {
      const next = new Set([...prev].filter((k) => visibleKeys.has(k)));
      for (const r of table.pageRows) {
        if (pageAllSelected) next.delete(r.key);
        else next.add(r.key);
      }
      return next;
    });
  }

  function exportRows(list: OhWorkRow[]) {
    downloadText(
      `oh-surveillance-worklist-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        ["Worker", "Worker ID", "Employer", "Job title", "Site", "Department", "Hazard profile", "Component", "Exam type", "Due date", "Status"],
        list.map((r) => [
          r.customer_name,
          r.customer_identifier,
          r.employer,
          r.job_title,
          r.site,
          r.department_name,
          r.hazard_profile,
          r.component_code,
          r.examLabel,
          r.due_date,
          r.overdue ? "overdue" : "due",
        ]),
      ),
    );
  }

  return (
    <div data-testid="oh-campaign-queue-section">
      <div className="flex flex-col gap-2 pb-3 lg:flex-row lg:items-center">
        <div className="lg:w-64">
          <ListPageSearchField
            id="oh-worklist-search"
            value={filters.search}
            placeholder="Search worker, employer, exam"
            onChange={(v) => set({ search: v })}
            onSubmit={() => undefined}
            data-testid="oh-worklist-search"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <FilterSelect
            label="Status"
            value={filters.status === "all" ? "" : filters.status}
            onChange={(v) => set({ status: (v || "all") as OhWorklistFilters["status"] })}
            allLabel="All statuses"
            options={[
              { value: "overdue", label: "Overdue" },
              { value: "due", label: "Due" },
            ]}
            className="sm:w-[130px]"
          />
          <FilterSelect
            label="Due window"
            value={filters.due === "any" ? "" : filters.due}
            onChange={(v) => set({ due: (v || "any") as OhDueFilter })}
            allLabel={DUE_FILTER_LABEL.any}
            options={(["overdue", "overdue_30", "next_7", "next_30", "next_90"] as const).map((k) => ({ value: k, label: DUE_FILTER_LABEL[k] }))}
          />
          <FilterSelect label="Exam" value={filters.exam} onChange={(v) => set({ exam: v })} allLabel="All exams" options={examOptions} className="sm:w-[130px]" />
          <FilterSelect label="Hazard profile" value={filters.hazard} onChange={(v) => set({ hazard: v })} allLabel="All hazards" options={hazardOptions} />
          <FilterSelect label="Site" value={filters.site} onChange={(v) => set({ site: v })} allLabel="All sites" options={siteOptions} className="sm:w-[130px]" />
          {activeCount > 0 ? (
            <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-[13px]" onClick={() => set(EMPTY_WORKLIST_FILTERS)}>
              <X className="size-3.5" aria-hidden /> Clear
            </Button>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 lg:ml-auto"
          disabled={filtered.length === 0}
          onClick={() => exportRows(table.sorted)}
        >
          <Download className="size-3.5" aria-hidden /> CSV
        </Button>
      </div>

      {selectedRows.length > 0 ? (
        <div
          className="mb-2 flex flex-wrap items-center gap-2 rounded-md bg-brand-tint/60 px-3 py-1.5 text-[13px]"
          role="region"
          aria-label="Bulk actions"
          data-testid="oh-worklist-bulk"
        >
          <span className="font-medium text-brand-navy">{selectedRows.length} selected</span>
          <Button
            type="button"
            size="sm"
            variant="primary"
            className="h-7 gap-1 text-xs"
            disabled={selectedRows.every((r) => !r.uuid)}
            onClick={() => onRecall(selectedRows)}
          >
            <BellRing className="size-3" aria-hidden /> Send recall
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => exportRows(selectedRows)}>
            <Download className="size-3" aria-hidden /> Export selected
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected(new Set())}>
            Clear selection
          </Button>
        </div>
      ) : null}

      <OhPanelState
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        isEmpty={filtered.length === 0}
        emptyText={rows.length === 0 ? "No due or overdue requirements. Everyone is up to date." : "No requirements match these filters."}
        height={220}
      >
        <ListPageDataTable className={OH_STICKY_TABLE}>
          <ListPageDataTableHeader>
            <ListPageDataTableHeaderRow>
              <ListPageDataTableHeaderCell className="w-9 pl-3">
                <input
                  type="checkbox"
                  className="size-4 accent-brand-primary"
                  aria-label="Select all on this page"
                  checked={pageAllSelected}
                  onChange={togglePage}
                />
              </ListPageDataTableHeaderCell>
              <OhSortHeader label="Worker" column="worker" sort={table.sort} onSort={table.toggleSort} />
              <OhSortHeader label="Exam" column="exam" sort={table.sort} onSort={table.toggleSort} />
              <ListPageDataTableHeaderCell className="hidden md:table-cell">Hazard profile</ListPageDataTableHeaderCell>
              <OhSortHeader label="Site / department" column="site" sort={table.sort} onSort={table.toggleSort} className="hidden lg:table-cell" />
              <OhSortHeader label="Due" column="due" sort={table.sort} onSort={table.toggleSort} />
              <ListPageDataTableHeaderCell className="pr-3 text-right">
                <span className="sr-only">Actions</span>
              </ListPageDataTableHeaderCell>
            </ListPageDataTableHeaderRow>
          </ListPageDataTableHeader>
          <ListPageDataTableBody>
            {table.pageRows.map((row) => (
              <ListPageDataTableRow
                key={row.key}
                className={cn("cursor-pointer", selected.has(row.key) && "bg-brand-tint/40")}
                onClick={() => onOpenRow(row)}
                data-testid="oh-worklist-row"
              >
                <ListPageDataTableCell className="pl-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="size-4 accent-brand-primary"
                    aria-label={`Select ${row.customer_name}`}
                    checked={selected.has(row.key)}
                    onChange={() => toggle(row.key)}
                  />
                </ListPageDataTableCell>
                <ListPageDataTableCell className="py-2">
                  <button
                    type="button"
                    className="text-left font-medium text-brand-navy hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-brand-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenRow(row);
                    }}
                  >
                    {row.customer_name || "Worker"}
                  </button>
                  <span className="block text-[12px] text-dash-muted">
                    {[row.customer_identifier, row.employer].filter(Boolean).join(" · ")}
                  </span>
                </ListPageDataTableCell>
                <ListPageDataTableCell>
                  <span className="font-medium text-brand-navy">{row.component_code}</span>
                  <span className="block text-[12px] text-dash-muted">{row.examLabel}</span>
                </ListPageDataTableCell>
                <ListPageDataTableCell className="hidden md:table-cell">{row.hazard_profile || "—"}</ListPageDataTableCell>
                <ListPageDataTableCell className="hidden lg:table-cell">
                  {[row.site, row.department_name].filter(Boolean).join(" · ") || "—"}
                </ListPageDataTableCell>
                <ListPageDataTableCell className="whitespace-nowrap">
                  <span className="tabular-nums text-brand-navy">{formatDate(row.due_date)}</span>
                  <span className="mt-0.5 block">
                    <Badge variant={row.overdue ? "destructive" : row.days !== null && row.days <= 7 ? "warning" : "outline"}>
                      {relativeDue(row.days)}
                    </Badge>
                  </span>
                </ListPageDataTableCell>
                <ListPageDataTableCell className="pr-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    disabled={!row.customer_uuid}
                    onClick={() => onSchedule(row)}
                    aria-label={`Schedule ${row.customer_name}`}
                  >
                    <CalendarPlus className="size-3.5" aria-hidden />
                    <span className="hidden sm:inline">Schedule</span>
                  </Button>
                </ListPageDataTableCell>
              </ListPageDataTableRow>
            ))}
          </ListPageDataTableBody>
        </ListPageDataTable>
        <ListPagePagination
          page={table.page}
          pageSize={table.pageSize}
          totalCount={table.total}
          hasPrevious={table.page > 1}
          hasNext={table.page < table.pageCount}
          onPageChange={table.setPage}
        />
      </OhPanelState>
    </div>
  );
}
