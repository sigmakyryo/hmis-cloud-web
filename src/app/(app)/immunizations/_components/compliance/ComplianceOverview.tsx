"use client";

import { useState } from "react";

import { SecondaryButton } from "@/components/ui/app-buttons";
import { ListPageDataTableCell, ListPageDataTableRow } from "@/features/app-shell/components/page-layout";
import { downloadOhImmComplianceCsv } from "@/features/occupational-health/services/immunisation.service";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

import { downloadBlob } from "../shared/download-blob";
import { EmptyAction } from "../shared/EmptyAction";
import { ImmEmployeeLink } from "../shared/ImmEmployeeLink";
import { ImmRecordTable, ImmStatusBadge } from "../shared/ImmRecordTable";
import { ImmFilterSelect, ImmSearchBar } from "../shared/ImmSearchBar";
import { ImmTabsBar } from "../shared/ImmTabsBar";
import { ImmCodeChips, ImmDateCell } from "../shared/ImmVisuals";
import { QuietLoading } from "../shared/QuietLoading";
import { useImmList } from "../shared/use-imm-list";

export type ComplianceDashboard = {
  group_by?: string;
  summary?: {
    people: number;
    compliant: number;
    percent_compliant: number;
    overdue_rows: number;
  };
  groups?: Array<{
    group: string;
    people: number;
    compliant: number;
    overdue: number;
    percent_compliant: number;
  }>;
  overdue?: Array<Record<string, unknown>>;
};

type ComplianceView = "groups" | "overdue";
type CoverageBand = "low" | "partial" | "full";
type Group = NonNullable<ComplianceDashboard["groups"]>[number];
type OverdueRow = Record<string, unknown>;

const BANDS: Array<{ key: CoverageBand; label: string; dot: string }> = [
  { key: "low", label: "Below 70%", dot: "bg-red-500" },
  { key: "partial", label: "70–89%", dot: "bg-amber-500" },
  { key: "full", label: "90% and above", dot: "bg-emerald-500" },
];

function bandOf(percent: number): CoverageBand {
  if (percent >= 90) return "full";
  if (percent >= 70) return "partial";
  return "low";
}

function bandColour(percent: number): string {
  const band = bandOf(percent);
  return band === "full" ? "bg-emerald-500" : band === "partial" ? "bg-amber-500" : "bg-red-500";
}

function CoverageBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-dash-canvas">
        <div className={cn("h-full rounded-full", bandColour(clamped))} style={{ width: `${clamped}%` }} />
      </div>
      <span className="w-10 text-right tabular-nums">{percent}%</span>
    </div>
  );
}

function CoverageGauge({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const band = bandOf(clamped);
  const stroke = band === "full" ? "stroke-emerald-500" : band === "partial" ? "stroke-amber-500" : "stroke-red-500";
  return (
    <svg viewBox="0 0 64 64" className="size-16 shrink-0 -rotate-90" aria-hidden>
      <circle cx="32" cy="32" r={radius} fill="none" stroke="currentColor" strokeWidth="7" className="text-dash-canvas" />
      <circle
        cx="32"
        cy="32"
        r={radius}
        fill="none"
        className={stroke}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped / 100)}
      />
    </svg>
  );
}

export function ComplianceOverview({ data, loading }: { data: ComplianceDashboard | undefined; loading: boolean }) {
  const { toast } = useToast();
  const [view, setView] = useState<ComplianceView>("groups");
  const [band, setBand] = useState<CoverageBand | "">("");
  const [vaccine, setVaccine] = useState("");

  const groups = data?.groups ?? [];
  const overdue = data?.overdue ?? [];

  const groupList = useImmList<Group>({
    rows: band ? groups.filter((group) => bandOf(group.percent_compliant) === band) : groups,
    searchText: (group) => group.group,
    sortValue: (group, key) =>
      key === "group"
        ? group.group
        : key === "people"
          ? group.people
          : key === "gap"
            ? group.people - group.compliant
            : key === "overdue"
              ? group.overdue
              : group.percent_compliant,
    defaultSort: { key: "coverage", direction: "asc" },
  });
  const overdueList = useImmList<OverdueRow>({
    rows: vaccine ? overdue.filter((row) => row.vaccine_code === vaccine) : overdue,
    searchText: (row) => [row.customer_uuid, row.vaccine_code, row.status].join(" "),
    sortValue: (row, key) => String(row[key] ?? ""),
    defaultSort: { key: "next_due_date", direction: "asc" },
  });

  if (loading) return <QuietLoading />;

  const summary = data?.summary;
  if (!summary) {
    return (
      <EmptyAction
        icon="analytics"
        title="No compliance data"
        description="Publish schedules with a fitness gate, then refresh statuses for employees."
      />
    );
  }

  if (summary.people === 0 && groups.length === 0) {
    return (
      <EmptyAction
        icon="analytics"
        title="Nobody is on a gated schedule yet"
        description="When published schedules with a fitness gate match employees, coverage appears here."
      />
    );
  }

  const bandCounts: Record<CoverageBand, number> = { low: 0, partial: 0, full: 0 };
  for (const group of groups) bandCounts[bandOf(group.percent_compliant)] += 1;
  const vaccines = Array.from(new Set(overdue.map((row) => String(row.vaccine_code ?? "")).filter(Boolean))).sort();
  const selectBand = (key: CoverageBand) => {
    setView("groups");
    setBand((current) => (current === key ? "" : key));
  };

  return (
    <>
      <div
        data-list-band
        data-testid="oh-imm-compliance-hero"
        className="flex flex-col gap-4 border-b border-dash-border/80 bg-white px-4 py-4 md:flex-row md:items-center md:px-6"
      >
        <div className="flex items-center gap-3">
          <CoverageGauge percent={summary.percent_compliant} />
          <div>
            <p className="text-lg font-semibold tabular-nums tracking-tight text-brand-navy">
              {summary.percent_compliant}% compliant
            </p>
            <p className="text-[12px] text-dash-muted">
              {summary.compliant} of {summary.people} people · {groups.length} employers
            </p>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2 md:pl-6">
          {groups.length > 0 ? (
            <div className="flex h-2 overflow-hidden rounded-full bg-dash-canvas" aria-hidden>
              {BANDS.map((item) =>
                bandCounts[item.key] > 0 ? (
                  <span key={item.key} className={item.dot} style={{ width: `${(bandCounts[item.key] / groups.length) * 100}%` }} />
                ) : null,
              )}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Coverage band">
            {BANDS.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={band === item.key}
                onClick={() => selectBand(item.key)}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] transition-colors",
                  band === item.key
                    ? "border-brand-primary bg-brand-tint text-brand-navy"
                    : "border-dash-border text-brand-slate hover:bg-dash-canvas",
                )}
              >
                <span className={cn("size-1.5 rounded-full", item.dot)} aria-hidden />
                {item.label}
                <span className="tabular-nums text-dash-muted">{bandCounts[item.key]}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setView("overdue")}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] transition-colors",
                summary.overdue_rows > 0
                  ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  : "border-dash-border text-brand-slate hover:bg-dash-canvas",
              )}
            >
              {summary.overdue_rows} overdue doses
            </button>
          </div>
        </div>
      </div>
      <ImmTabsBar
        label="Compliance records"
        active={view}
        onChange={setView}
        tabs={[
          { key: "groups", label: "By employer", count: groups.length },
          { key: "overdue", label: "Overdue", count: overdue.length },
        ]}
        actions={
          <SecondaryButton
            type="button"
            className="h-8"
            onClick={async () => {
              try {
                const { blob, filename } = await downloadOhImmComplianceCsv();
                downloadBlob(blob, filename);
              } catch (error) {
                toast({
                  variant: "error",
                  title: "Export failed",
                  description: error instanceof Error ? error.message : "Try again.",
                });
              }
            }}
          >
            Export CSV
          </SecondaryButton>
        }
      />
      {view === "groups" ? (
        groups.length === 0 ? (
          <EmptyAction icon="building" title="No groups" description="Coverage by employer appears once employees match a gated schedule." />
        ) : (
          <>
            <ImmSearchBar
              value={groupList.query}
              onChange={groupList.setQuery}
              placeholder="Search employer"
              matched={groupList.controls.matched}
              total={groups.length}
              onClear={
                band || groupList.query
                  ? () => {
                      setBand("");
                      groupList.setQuery("");
                    }
                  : undefined
              }
            />
            {groupList.pageRows.length === 0 ? (
              <EmptyAction icon="search" title="No matching employers" description="Change the search or coverage band." />
            ) : (
              <ImmRecordTable
                list={groupList.controls}
                columns={[
                  { label: "Employer", sortKey: "group" },
                  { label: "People", sortKey: "people", align: "right" },
                  { label: "Not compliant", sortKey: "gap", align: "right" },
                  { label: "Overdue", sortKey: "overdue", align: "right" },
                  { label: "Coverage", sortKey: "coverage" },
                ]}
              >
                {groupList.pageRows.map((group) => (
                  <ListPageDataTableRow key={group.group}>
                    <ListPageDataTableCell className="pl-4 font-medium text-brand-navy md:pl-6">{group.group}</ListPageDataTableCell>
                    <ListPageDataTableCell className="text-right tabular-nums">{group.people}</ListPageDataTableCell>
                    <ListPageDataTableCell className="text-right tabular-nums">{group.people - group.compliant}</ListPageDataTableCell>
                    <ListPageDataTableCell className={cn("text-right tabular-nums", group.overdue > 0 && "font-medium text-red-700")}>
                      {group.overdue}
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <CoverageBar percent={group.percent_compliant} />
                    </ListPageDataTableCell>
                  </ListPageDataTableRow>
                ))}
              </ImmRecordTable>
            )}
          </>
        )
      ) : overdue.length === 0 ? (
        <EmptyAction icon="calendar" title="Nothing overdue" description="Every gated schedule is up to date." />
      ) : (
        <>
          <ImmSearchBar
            value={overdueList.query}
            onChange={overdueList.setQuery}
            placeholder="Search employee or vaccine"
            matched={overdueList.controls.matched}
            total={overdue.length}
            filters={
              <ImmFilterSelect label="Vaccine" value={vaccine} onChange={setVaccine}>
                <option value="">All vaccines</option>
                {vaccines.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </ImmFilterSelect>
            }
          />
          {overdueList.pageRows.length === 0 ? (
            <EmptyAction icon="search" title="No matching doses" description="Change the search or vaccine." />
          ) : (
            <ImmRecordTable
              list={overdueList.controls}
              columns={[
                { label: "Employee", sortKey: "customer_uuid" },
                { label: "Vaccine", sortKey: "vaccine_code" },
                { label: "Next due", sortKey: "next_due_date" },
                { label: "Status", sortKey: "status" },
              ]}
            >
              {overdueList.pageRows.map((row, index) => (
                <ListPageDataTableRow key={`${String(row.customer_uuid)}-${String(row.vaccine_code)}-${index}`}>
                  <ListPageDataTableCell className="pl-4 md:pl-6">
                    <ImmEmployeeLink uuid={String(row.customer_uuid ?? "")} />
                  </ListPageDataTableCell>
                  <ListPageDataTableCell>
                    <ImmCodeChips codes={row.vaccine_code ? [String(row.vaccine_code)] : []} />
                  </ListPageDataTableCell>
                  <ListPageDataTableCell>
                    <ImmDateCell date={(row.next_due_date as string | null) ?? null} />
                  </ListPageDataTableCell>
                  <ListPageDataTableCell>
                    <ImmStatusBadge status={String(row.status ?? "")} />
                  </ListPageDataTableCell>
                </ListPageDataTableRow>
              ))}
            </ImmRecordTable>
          )}
        </>
      )}
    </>
  );
}
