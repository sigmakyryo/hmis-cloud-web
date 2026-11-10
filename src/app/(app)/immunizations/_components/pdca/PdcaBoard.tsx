"use client";

import { type ReactNode, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { AppIcon } from "@/components/icons/app-icon";
import { PageActionButton, PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ListPageDataTableCell, ListPageDataTableRow } from "@/features/app-shell/components/page-layout";
import { Drawer, DrawerActions } from "../shared/Drawer";
import { EmptyAction } from "../shared/EmptyAction";
import { Field, SelectField } from "../shared/Field";
import { ImmInsightStrip } from "../shared/ImmInsightStrip";
import { ImmPrimaryCell, ImmRecordTable, ImmRowAction, ImmStatusBadge, humanize } from "../shared/ImmRecordTable";
import { ImmFilterSelect, ImmSearchBar } from "../shared/ImmSearchBar";
import { ImmNotice, ImmTabsBar } from "../shared/ImmTabsBar";
import { ImmDateCell } from "../shared/ImmVisuals";
import { LoadError, QuietLoading } from "../shared/QuietLoading";
import { useImmList } from "../shared/use-imm-list";
import { type PdcaStage, PdcaKanban, PdcaPipeline } from "./PdcaPipeline";
import { PDCA_STAGES, RcaSheet } from "./RcaSheet";
import {
  createOhImmSeroAudit,
  createOhImmVendor,
  fetchOhImmPdca,
  fetchOhImmSeroAudits,
  fetchOhImmVendors,
  recordOhImmColdChain,
  recordOhImmSeroAggregates,
} from "@/features/occupational-health/services/immunisation.service";

type PdcaView = "rca" | "sero" | "vendors";
type RcaLayout = "table" | "board";
type PdcaSheet = "audit" | "results" | "vendor" | "temperature" | null;
type Row = Record<string, unknown>;

const EMPTY_AUDIT = {
  title: "",
  cohort_type: "risk_band",
  cohort_value: "",
  k_anonymity: "5",
};
const EMPTY_VENDOR = {
  code: "",
  name: "",
  contact: "",
  audit_result: "pass",
  last_audit_on: "",
};
const EMPTY_TEMPERATURE = {
  storage_unit: "",
  temperature_c: "",
  min_c: "2",
  max_c: "8",
  lot_uuid: "",
  lot_number: "",
};

type SeroAggregate = { cells?: unknown[]; hidden_cells?: number } | null;

function countOf(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function parseCells(text: string): Array<{ cell: string; n: number; positive: number }> {
  return text
    .split("\n")
    .map((line) => line.split(",").map((part) => part.trim()))
    .filter((parts) => parts.length === 3 && parts[0])
    .map(([cell, n, positive]) => ({
      cell,
      n: Number(n),
      positive: Number(positive),
    }));
}

export function PdcaBoard() {
  const qc = useQueryClient();
  const boardQ = useQuery({
    queryKey: ["oh-imm-pdca"],
    queryFn: fetchOhImmPdca,
  });
  const seroQ = useQuery({
    queryKey: ["oh-imm-sero"],
    queryFn: fetchOhImmSeroAudits,
  });
  const vendorsQ = useQuery({
    queryKey: ["oh-imm-vendors"],
    queryFn: fetchOhImmVendors,
  });

  const [view, setView] = useState<PdcaView>("rca");
  const [stage, setStage] = useState<PdcaStage | "all">("all");
  const [layout, setLayout] = useState<RcaLayout>("table");
  const [vendorResult, setVendorResult] = useState("");
  const [sheet, setSheet] = useState<PdcaSheet>(null);
  const [selectedRca, setSelectedRca] = useState<string | null>(null);
  const [resultsAudit, setResultsAudit] = useState<Row | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [audit, setAudit] = useState(EMPTY_AUDIT);
  const [cellsText, setCellsText] = useState("");
  const [vendor, setVendor] = useState(EMPTY_VENDOR);
  const [temperature, setTemperature] = useState(EMPTY_TEMPERATURE);

  const byStage = Object.fromEntries(
    PDCA_STAGES.map((key) => [
      key,
      ((boardQ.data?.[key] as Row[] | undefined) ?? []).map((rca): Row => ({
        ...rca,
        stage: key,
      })),
    ]),
  ) as Record<PdcaStage, Row[]>;
  const allRcas: Row[] = PDCA_STAGES.flatMap((key) => byStage[key]);
  const audits = seroQ.data ?? [];
  const vendors = vendorsQ.data ?? [];

  const rcaList = useImmList<Row>({
    rows: stage === "all" ? allRcas : byStage[stage],
    searchText: (rca) => [rca.summary, rca.status, rca.stage].join(" "),
    sortValue: (rca, key) =>
      key === "stage"
        ? PDCA_STAGES.indexOf(rca.stage as PdcaStage)
        : key === "actions"
          ? countOf(rca.actions)
          : key === "checked"
            ? (rca.effectiveness_checked_at as string | null)
            : String(rca.summary ?? ""),
  });
  const auditList = useImmList<Row>({
    rows: audits,
    searchText: (row) => [row.title, row.cohort_type, row.cohort_value, row.status].join(" "),
    sortValue: (row, key) => (key === "k" ? Number(row.k_anonymity) : String(row[key] ?? "")),
  });
  const vendorList = useImmList<Row>({
    rows: vendorResult ? vendors.filter((row) => row.audit_result === vendorResult) : vendors,
    searchText: (row) => [row.name, row.code, row.contact].join(" "),
    sortValue: (row, key) => String(row[key] ?? ""),
    defaultSort: { key: "name", direction: "asc" },
  });

  const loading = boardQ.isLoading || seroQ.isLoading || vendorsQ.isLoading;
  const errored = boardQ.isError || seroQ.isError || vendorsQ.isError;
  if (loading) return <QuietLoading />;
  if (errored) return <LoadError>Could not load PDCA board. Check your connection and try again.</LoadError>;

  const activeRca = allRcas.find((rca) => rca.uuid === selectedRca) ?? null;
  const notStarted = allRcas.filter((rca) => rca.status === "stub").length;
  const unchecked = allRcas.filter((rca) => rca.stage === "check" && !rca.effectiveness_checked_at).length;
  const openActions = allRcas.reduce(
    (sum, rca) => sum + (Array.isArray(rca.actions) ? rca.actions.filter((a) => (a as Row)?.status !== "done").length : 0),
    0,
  );
  const failedVendors = vendors.filter((row) => row.audit_result === "fail").length;

  async function run(work: () => Promise<unknown>, message: string, queryKey: string) {
    setBusy(true);
    try {
      const outcome = await work();
      setMsg(typeof outcome === "string" ? outcome : message);
      setSheet(null);
      void qc.invalidateQueries({ queryKey: [queryKey] });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const actions: Record<PdcaView, ReactNode> = {
    rca: null,
    sero: (
      <PageActionButton type="button" onClick={() => setSheet("audit")}>
        <AppIcon name="add" className="size-3.5" />
        New audit
      </PageActionButton>
    ),
    vendors: (
      <>
        <SecondaryButton type="button" className="h-8" onClick={() => setSheet("temperature")}>
          Log temperature
        </SecondaryButton>
        <PageActionButton type="button" onClick={() => setSheet("vendor")}>
          <AppIcon name="add" className="size-3.5" />
          Add vendor
        </PageActionButton>
      </>
    ),
  };

  return (
    <>
      <ImmTabsBar
        testId="oh-imm-pdca-panel"
        label="PDCA records"
        active={view}
        onChange={setView}
        tabs={[
          { key: "rca", label: "Root cause analyses", count: allRcas.length },
          { key: "sero", label: "Sero audits", count: audits.length },
          { key: "vendors", label: "Vendors", count: vendors.length },
        ]}
        actions={actions[view]}
      />
      {msg ? <ImmNotice>{msg}</ImmNotice> : null}

      {view === "rca" ? (
        <>
          {allRcas.length > 0 ? (
            <>
              <ImmInsightStrip
                testId="oh-imm-pdca-insights"
                items={[
                  { label: "RCAs", value: allRcas.length },
                  {
                    label: "not started",
                    value: notStarted,
                    tone: notStarted > 0 ? "warning" : "default",
                  },
                  { label: "open corrective actions", value: openActions },
                  {
                    label: "awaiting effectiveness check",
                    value: unchecked,
                    tone: unchecked > 0 ? "warning" : "default",
                    onSelect: () => setStage((current) => (current === "check" ? "all" : "check")),
                    active: stage === "check",
                  },
                  {
                    label: "closed",
                    value: byStage.act.length,
                    tone: byStage.act.length > 0 ? "success" : "default",
                  },
                ]}
              />
              <PdcaPipeline byStage={byStage} active={stage} onSelect={setStage} />
            </>
          ) : null}
          {allRcas.length === 0 ? (
            <EmptyAction
              icon="activity"
              title="No RCA items yet"
              description="Each logged exposure creates an RCA here under Plan."
            />
          ) : (
            <>
              <ImmSearchBar
                value={rcaList.query}
                onChange={rcaList.setQuery}
                placeholder="Search RCA summary"
                matched={layout === "board" ? allRcas.length : rcaList.controls.matched}
                total={allRcas.length}
                onClear={
                  stage !== "all" || rcaList.query
                    ? () => {
                        setStage("all");
                        rcaList.setQuery("");
                      }
                    : undefined
                }
                filters={
                  <div className="inline-flex rounded-md border border-dash-border p-0.5" role="group" aria-label="Layout">
                    {(["table", "board"] as const).map((key) => (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={layout === key}
                        onClick={() => setLayout(key)}
                        className={
                          layout === key
                            ? "h-7 rounded px-2.5 text-[12px] font-medium text-white bg-brand-navy"
                            : "h-7 rounded px-2.5 text-[12px] text-brand-slate hover:bg-dash-canvas"
                        }
                      >
                        {key === "table" ? "Table" : "Board"}
                      </button>
                    ))}
                  </div>
                }
              />
              {layout === "board" ? (
                <PdcaKanban
                  byStage={byStage}
                  onOpen={setSelectedRca}
                  onShowAll={(key) => {
                    setStage(key);
                    setLayout("table");
                  }}
                />
              ) : rcaList.pageRows.length === 0 ? (
                <EmptyAction icon="search" title="No matching RCAs" description="Change the stage or search to see more." />
              ) : (
                <ImmRecordTable
                  list={rcaList.controls}
                  columns={[
                    { label: "Summary", sortKey: "summary" },
                    { label: "Stage", sortKey: "stage" },
                    "Status",
                    "Root cause",
                    {
                      label: "Corrective actions",
                      sortKey: "actions",
                      align: "right",
                    },
                    { label: "Effectiveness", sortKey: "checked" },
                    "Actions",
                  ]}
                >
                  {rcaList.pageRows.map((rca) => {
                    const whys = countOf(rca.five_whys);
                    return (
                      <ListPageDataTableRow
                        key={String(rca.uuid)}
                        className="cursor-pointer"
                        onClick={() => setSelectedRca(String(rca.uuid))}
                      >
                        <ListPageDataTableCell className="max-w-[24rem] pl-4 md:pl-6">
                          <ImmPrimaryCell title={String(rca.summary || "Exposure RCA")} />
                        </ListPageDataTableCell>
                        <ListPageDataTableCell>
                          <span className="rounded-md bg-brand-tint px-1.5 py-0.5 text-[11px] font-semibold uppercase text-brand-primary">
                            {humanize(String(rca.stage))}
                          </span>
                        </ListPageDataTableCell>
                        <ListPageDataTableCell>
                          <ImmStatusBadge status={String(rca.status ?? "")} />
                        </ListPageDataTableCell>
                        <ListPageDataTableCell>
                          <span className="flex items-center gap-2">
                            <span className="flex gap-0.5" aria-hidden>
                              {[0, 1, 2, 3, 4].map((i) => (
                                <span
                                  key={i}
                                  className={
                                    i < whys ? "h-1.5 w-3 rounded-full bg-brand-primary" : "h-1.5 w-3 rounded-full bg-dash-border"
                                  }
                                />
                              ))}
                            </span>
                            <span className="text-[12px] text-dash-muted">{whys}/5 whys</span>
                          </span>
                        </ListPageDataTableCell>
                        <ListPageDataTableCell className="text-right tabular-nums">{countOf(rca.actions)}</ListPageDataTableCell>
                        <ListPageDataTableCell>
                          {rca.effectiveness_checked_at ? (
                            <ImmDateCell date={String(rca.effectiveness_checked_at).slice(0, 10)} pastIsBad={false} />
                          ) : (
                            <span className="text-dash-muted">Not checked</span>
                          )}
                        </ListPageDataTableCell>
                        <ListPageDataTableCell className="pr-4 text-right md:pr-6">
                          <ImmRowAction onClick={() => setSelectedRca(String(rca.uuid))}>
                            {rca.status === "stub" ? "Start RCA" : "Open"}
                          </ImmRowAction>
                        </ListPageDataTableCell>
                      </ListPageDataTableRow>
                    );
                  })}
                </ImmRecordTable>
              )}
            </>
          )}
        </>
      ) : null}

      {view === "sero" ? (
        audits.length === 0 ? (
          <EmptyAction
            icon="flask"
            title="No sero audits yet"
            description="Results stay aggregate-only. Cells smaller than the k-anonymity threshold are hidden."
          />
        ) : (
          <>
            <ImmSearchBar
              value={auditList.query}
              onChange={auditList.setQuery}
              placeholder="Search audit or cohort"
              matched={auditList.controls.matched}
              total={audits.length}
            />
            <ImmRecordTable
              list={auditList.controls}
              columns={[
                { label: "Audit", sortKey: "title" },
                { label: "Cohort", sortKey: "cohort_type" },
                { label: "k", sortKey: "k", align: "right" },
                "Cells shown",
                "Cells hidden",
                { label: "Status", sortKey: "status" },
                "Actions",
              ]}
            >
              {auditList.pageRows.map((row) => {
                const aggregate = row.aggregate as SeroAggregate;
                return (
                  <ListPageDataTableRow key={String(row.uuid)}>
                    <ListPageDataTableCell className="pl-4 font-medium text-brand-navy md:pl-6">
                      {String(row.title)}
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      {humanize(String(row.cohort_type ?? ""))}
                      {row.cohort_value ? ` · ${String(row.cohort_value)}` : ""}
                    </ListPageDataTableCell>
                    <ListPageDataTableCell className="text-right tabular-nums">{String(row.k_anonymity)}</ListPageDataTableCell>
                    <ListPageDataTableCell className="tabular-nums">{aggregate?.cells?.length ?? "—"}</ListPageDataTableCell>
                    <ListPageDataTableCell className="tabular-nums">{aggregate?.hidden_cells ?? "—"}</ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <ImmStatusBadge status={String(row.status ?? "")} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell className="pr-4 text-right md:pr-6">
                      {row.status !== "complete" ? (
                        <ImmRowAction
                          onClick={() => {
                            setResultsAudit(row);
                            setCellsText("");
                            setSheet("results");
                          }}
                        >
                          Record results
                        </ImmRowAction>
                      ) : (
                        "—"
                      )}
                    </ListPageDataTableCell>
                  </ListPageDataTableRow>
                );
              })}
            </ImmRecordTable>
          </>
        )
      ) : null}

      {view === "vendors" ? (
        vendors.length === 0 ? (
          <EmptyAction
            icon="package"
            title="No vendors yet"
            description="Add vaccine suppliers and their latest cold-chain audit."
          />
        ) : (
          <>
            <ImmSearchBar
              value={vendorList.query}
              onChange={vendorList.setQuery}
              placeholder="Search vendor"
              matched={vendorList.controls.matched}
              total={vendors.length}
              filters={
                <ImmFilterSelect label="Audit result" value={vendorResult} onChange={setVendorResult}>
                  <option value="">Any result</option>
                  <option value="pass">Pass</option>
                  <option value="conditional">Conditional</option>
                  <option value="fail">Fail{failedVendors ? ` (${failedVendors})` : ""}</option>
                </ImmFilterSelect>
              }
            />
            {vendorList.pageRows.length === 0 ? (
              <EmptyAction icon="search" title="No matching vendors" description="Change the search or audit result." />
            ) : (
              <ImmRecordTable
                list={vendorList.controls}
                columns={[
                  { label: "Vendor", sortKey: "name" },
                  "Contact",
                  { label: "Last audit", sortKey: "last_audit_on" },
                  { label: "Audit result", sortKey: "audit_result" },
                ]}
              >
                {vendorList.pageRows.map((row) => (
                  <ListPageDataTableRow key={String(row.uuid)}>
                    <ListPageDataTableCell className="pl-4 md:pl-6">
                      <ImmPrimaryCell title={String(row.name)} detail={String(row.code)} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>{String(row.contact ?? "") || "—"}</ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <ImmDateCell date={(row.last_audit_on as string | null) ?? null} pastIsBad={false} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      {row.audit_result ? <ImmStatusBadge status={String(row.audit_result)} /> : "—"}
                    </ListPageDataTableCell>
                  </ListPageDataTableRow>
                ))}
              </ImmRecordTable>
            )}
          </>
        )
      ) : null}

      {activeRca ? (
        <RcaSheet
          key={String(activeRca.uuid)}
          rca={activeRca}
          onClose={() => setSelectedRca(null)}
          onSaved={(message, keepOpen) => {
            setMsg(message);
            if (!keepOpen) setSelectedRca(null);
            void qc.invalidateQueries({ queryKey: ["oh-imm-pdca"] });
          }}
        />
      ) : null}

      <Drawer
        open={sheet === "audit"}
        title="New sero audit"
        description="Only aggregate results are stored. Cells smaller than k are hidden."
        onClose={() => setSheet(null)}
      >
        <Field label="Title" required value={audit.title} onChange={(value) => setAudit((a) => ({ ...a, title: value }))} />
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Cohort"
            required
            value={audit.cohort_type}
            onChange={(value) => setAudit((a) => ({ ...a, cohort_type: value }))}
          >
            <option value="risk_band">Risk band</option>
            <option value="department">Department</option>
            <option value="site">Site</option>
          </SelectField>
          <Field
            label="Cohort value"
            value={audit.cohort_value}
            onChange={(value) => setAudit((a) => ({ ...a, cohort_value: value }))}
          />
        </div>
        <Field
          label="k-anonymity"
          type="number"
          required
          value={audit.k_anonymity}
          onChange={(value) => setAudit((a) => ({ ...a, k_anonymity: value }))}
        />
        <DrawerActions>
          <SecondaryButton type="button" onClick={() => setSheet(null)}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={busy || !audit.title.trim()}
            onClick={() =>
              void run(
                () =>
                  createOhImmSeroAudit({
                    ...audit,
                    k_anonymity: Number(audit.k_anonymity),
                  }).then(() => setAudit(EMPTY_AUDIT)),
                "Sero audit created.",
                "oh-imm-sero",
              )
            }
          >
            Create audit
          </PrimaryButton>
        </DrawerActions>
      </Drawer>

      {resultsAudit ? (
        <Drawer
          open={sheet === "results"}
          title={`Record results · ${String(resultsAudit.title)}`}
          description={`Enter one cell per line as name, tested, positive. Cells with fewer than ${String(resultsAudit.k_anonymity)} people are hidden.`}
          onClose={() => setSheet(null)}
        >
          <div className="space-y-1.5">
            <Label>Cells</Label>
            <Textarea
              rows={6}
              placeholder={"high, 12, 3\nlow, 9, 1"}
              value={cellsText}
              onChange={(e) => setCellsText(e.target.value)}
            />
          </div>
          <DrawerActions>
            <SecondaryButton type="button" onClick={() => setSheet(null)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              type="button"
              disabled={busy || parseCells(cellsText).length === 0}
              onClick={() =>
                void run(
                  () => recordOhImmSeroAggregates(String(resultsAudit.uuid), parseCells(cellsText)),
                  "Sero results recorded.",
                  "oh-imm-sero",
                )
              }
            >
              Save results
            </PrimaryButton>
          </DrawerActions>
        </Drawer>
      ) : null}

      <Drawer open={sheet === "vendor"} title="Add vendor" onClose={() => setSheet(null)}>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Code"
            required
            value={vendor.code}
            onChange={(value) => setVendor((v) => ({ ...v, code: value.toUpperCase() }))}
          />
          <Field label="Name" required value={vendor.name} onChange={(value) => setVendor((v) => ({ ...v, name: value }))} />
        </div>
        <Field label="Contact" value={vendor.contact} onChange={(value) => setVendor((v) => ({ ...v, contact: value }))} />
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Audit result"
            value={vendor.audit_result}
            onChange={(value) => setVendor((v) => ({ ...v, audit_result: value }))}
          >
            <option value="pass">Pass</option>
            <option value="conditional">Conditional</option>
            <option value="fail">Fail</option>
          </SelectField>
          <Field
            label="Last audit"
            type="date"
            value={vendor.last_audit_on}
            onChange={(value) => setVendor((v) => ({ ...v, last_audit_on: value }))}
          />
        </div>
        <DrawerActions>
          <SecondaryButton type="button" onClick={() => setSheet(null)}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={busy || !vendor.code.trim() || !vendor.name.trim()}
            onClick={() =>
              void run(
                () =>
                  createOhImmVendor({
                    ...vendor,
                    last_audit_on: vendor.last_audit_on || undefined,
                  }).then(() => setVendor(EMPTY_VENDOR)),
                "Vendor added.",
                "oh-imm-vendors",
              )
            }
          >
            Add vendor
          </PrimaryButton>
        </DrawerActions>
      </Drawer>

      <Drawer
        open={sheet === "temperature"}
        title="Log storage temperature"
        description="Readings outside the range are excursions. A linked lot is quarantined automatically."
        onClose={() => setSheet(null)}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Storage unit"
            required
            value={temperature.storage_unit}
            onChange={(value) => setTemperature((t) => ({ ...t, storage_unit: value }))}
          />
          <Field
            label="Temperature (°C)"
            type="number"
            required
            value={temperature.temperature_c}
            onChange={(value) => setTemperature((t) => ({ ...t, temperature_c: value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Min (°C)"
            type="number"
            value={temperature.min_c}
            onChange={(value) => setTemperature((t) => ({ ...t, min_c: value }))}
          />
          <Field
            label="Max (°C)"
            type="number"
            value={temperature.max_c}
            onChange={(value) => setTemperature((t) => ({ ...t, max_c: value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Lot number"
            value={temperature.lot_number}
            onChange={(value) => setTemperature((t) => ({ ...t, lot_number: value }))}
          />
          <Field
            label="Lot ID"
            value={temperature.lot_uuid}
            onChange={(value) => setTemperature((t) => ({ ...t, lot_uuid: value }))}
          />
        </div>
        <DrawerActions>
          <SecondaryButton type="button" onClick={() => setSheet(null)}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={busy || !temperature.storage_unit.trim() || temperature.temperature_c === ""}
            onClick={() =>
              void run(
                async () => {
                  const result = await recordOhImmColdChain({
                    storage_unit: temperature.storage_unit,
                    temperature_c: Number(temperature.temperature_c),
                    min_c: Number(temperature.min_c),
                    max_c: Number(temperature.max_c),
                    lot_uuid: temperature.lot_uuid || undefined,
                    lot_number: temperature.lot_number,
                    recorded_by: "OH",
                  });
                  setTemperature(EMPTY_TEMPERATURE);
                  if (!result.excursion) return undefined;
                  return temperature.lot_uuid
                    ? "Excursion recorded. The linked lot was quarantined."
                    : "Excursion recorded. Link a lot to quarantine it.";
                },
                "Temperature in range.",
                "oh-imm-lots",
              )
            }
          >
            Log reading
          </PrimaryButton>
        </DrawerActions>
      </Drawer>
    </>
  );
}
