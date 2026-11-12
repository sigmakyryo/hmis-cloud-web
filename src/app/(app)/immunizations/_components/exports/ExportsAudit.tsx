"use client";

import { type ReactNode, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { AppIcon } from "@/components/icons/app-icon";
import { PageActionButton, PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ListPageDataTableCell, ListPageDataTableRow } from "@/features/app-shell/components/page-layout";
import { useToast } from "@/providers/toast-provider";
import { CertificatePdfForm } from "../shared/CertificatePdfForm";
import { Drawer, DrawerActions } from "../shared/Drawer";
import { EmptyAction } from "../shared/EmptyAction";
import { Field } from "../shared/Field";
import { ImmPrimaryCell, ImmRecordTable, ImmRowAction, ImmStatusBadge, humanize } from "../shared/ImmRecordTable";
import { ImmFilterSelect, ImmSearchBar } from "../shared/ImmSearchBar";
import { ImmTabsBar } from "../shared/ImmTabsBar";
import { ImmCodeChips, daysFromToday } from "../shared/ImmVisuals";
import { QuietLoading } from "../shared/QuietLoading";
import { useImmList } from "../shared/use-imm-list";
import { downloadBlob } from "../shared/download-blob";
import {
  type OhImmSchedule,
  createOhImmDhisMapping,
  downloadOhImmDhisCsv,
  downloadOhImmFhirNdjson,
  exportOhImmPack,
  fetchOhImmAudits,
  fetchOhImmDhisMappings,
  importOhImmPack,
} from "@/features/occupational-health/services/immunisation.service";

type ExportsView = "reports" | "mappings" | "packs" | "audit";
type ExportsSheet = "dhis" | "certificate" | "mapping" | "import" | null;

const AUDIT_LIMIT = 200;
type Row = Record<string, unknown>;

const EMPTY_MAPPING = { vaccine_code: "", data_element_id: "", label: "", age_band: "18+" };

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function auditWhen(value: unknown): { time: string; day: string } {
  if (!value) return { time: "—", day: "" };
  const text = String(value);
  const days = daysFromToday(text);
  const day = days === 0 ? "Today" : days === -1 ? "Yesterday" : text.slice(0, 10);
  return { time: text.slice(11, 16), day };
}

function distinct(rows: Row[], key: string): string[] {
  return Array.from(new Set(rows.map((row) => String(row[key] ?? "")).filter(Boolean))).sort();
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function ExportsAudit({ schedules }: { schedules: OhImmSchedule[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const audits = useQuery({ queryKey: ["oh-imm-audits"], queryFn: () => fetchOhImmAudits({ limit: AUDIT_LIMIT }) });
  const mappings = useQuery({ queryKey: ["oh-imm-dhis-mappings"], queryFn: fetchOhImmDhisMappings });

  const [view, setView] = useState<ExportsView>("reports");
  const [sheet, setSheet] = useState<ExportsSheet>(null);
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState(currentPeriod);
  const [orgUnit, setOrgUnit] = useState("OU");
  const [mapping, setMapping] = useState(EMPTY_MAPPING);
  const [packJson, setPackJson] = useState("");
  const [auditEntity, setAuditEntity] = useState("");
  const [auditAction, setAuditAction] = useState("");
  const [packStatus, setPackStatus] = useState("");

  const mappingRows: Row[] = mappings.data ?? [];
  const auditRows: Row[] = audits.data ?? [];

  const auditList = useImmList<Row>({
    rows: auditRows.filter(
      (row) => (!auditEntity || row.entity_type === auditEntity) && (!auditAction || row.action === auditAction),
    ),
    searchText: (row) => [row.entity_type, row.action, row.summary, row.actor_name].join(" "),
    sortValue: (row, key) => String(row[key] ?? ""),
    defaultSort: { key: "occurred_at", direction: "desc" },
  });
  const mappingList = useImmList<Row>({
    rows: mappingRows,
    searchText: (row) => [row.vaccine_code, row.data_element_id, row.label, row.age_band].join(" "),
    sortValue: (row, key) => String(row[key] ?? ""),
    defaultSort: { key: "vaccine_code", direction: "asc" },
  });
  const packList = useImmList<OhImmSchedule>({
    rows: packStatus ? schedules.filter((schedule) => (packStatus === "published") === Boolean(schedule.published_version)) : schedules,
    searchText: (schedule) => [schedule.name, schedule.code, schedule.category].join(" "),
    sortValue: (schedule, key) => (key === "category" ? schedule.category : schedule.name),
    defaultSort: { key: "name", direction: "asc" },
  });

  async function attempt(work: () => Promise<void>, failure: string) {
    setBusy(true);
    try {
      await work();
    } catch (error) {
      toast({ variant: "error", title: failure, description: errorText(error, "Try again.") });
    } finally {
      setBusy(false);
    }
  }

  const reports: Array<{
    key: string;
    title: string;
    detail: string;
    format: string;
    icon: "layers" | "analytics" | "file";
    action: ReactNode;
  }> = [
    {
      key: "fhir",
      title: "FHIR immunizations",
      detail: "Every administered dose for this facility, read-only.",
      format: "NDJSON",
      icon: "layers",
      action: (
        <ImmRowAction
          disabled={busy}
          onClick={() =>
            void attempt(async () => {
              const { blob, filename } = await downloadOhImmFhirNdjson();
              downloadBlob(blob, filename);
            }, "FHIR export failed")
          }
        >
          Download
        </ImmRowAction>
      ),
    },
    {
      key: "dhis",
      title: "DHIS2 aggregates",
      detail: "Monthly dose counts per mapped data element.",
      format: "CSV",
      icon: "analytics",
      action: <ImmRowAction onClick={() => setSheet("dhis")}>Download</ImmRowAction>,
    },
    {
      key: "certificate",
      title: "Vaccination certificate",
      detail: "A4 certificate for one employee. Also on their immunizations tab.",
      format: "PDF",
      icon: "file",
      action: <ImmRowAction onClick={() => setSheet("certificate")}>Issue</ImmRowAction>,
    },
  ];

  const actions: Record<ExportsView, ReactNode> = {
    reports: null,
    mappings: (
      <PageActionButton type="button" onClick={() => setSheet("mapping")}>
        <AppIcon name="add" className="size-3.5" />
        Add mapping
      </PageActionButton>
    ),
    packs: (
      <PageActionButton type="button" onClick={() => setSheet("import")}>
        <AppIcon name="add" className="size-3.5" />
        Import pack
      </PageActionButton>
    ),
    audit: null,
  };

  return (
    <>
      <ImmTabsBar
        label="Exports and audit"
        active={view}
        onChange={setView}
        tabs={[
          { key: "reports", label: "Reports", count: reports.length },
          { key: "mappings", label: "DHIS2 mappings", count: mappingRows.length },
          { key: "packs", label: "Schedule packs", count: schedules.length },
          { key: "audit", label: "Audit trail", count: auditRows.length },
        ]}
        actions={actions[view]}
      />

      {view === "reports" ? (
        <div data-list-band className="grid gap-3 bg-dash-canvas/60 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3 md:px-6">
          {reports.map((report) => (
            <article key={report.key} className="flex flex-col gap-3 rounded-lg border border-dash-border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex size-9 items-center justify-center rounded-lg bg-brand-tint text-brand-primary">
                  <AppIcon name={report.icon} className="size-4" />
                </span>
                <span className="rounded-md border border-dash-border px-1.5 py-0.5 font-mono text-[11px] text-brand-slate">
                  {report.format}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-[14px] font-semibold text-brand-navy">{report.title}</h3>
                <p className="mt-1 text-[12px] text-dash-muted">{report.detail}</p>
              </div>
              <div>{report.action}</div>
            </article>
          ))}
        </div>
      ) : null}

      {view === "mappings" ? (
        mappings.isLoading ? (
          <QuietLoading />
        ) : mappingRows.length === 0 ? (
          <EmptyAction icon="layers" title="No mappings yet" description="Map each vaccine to a DHIS2 data element before exporting aggregates." />
        ) : (
          <>
            <ImmSearchBar
              value={mappingList.query}
              onChange={mappingList.setQuery}
              placeholder="Search vaccine, data element, or label"
              matched={mappingList.controls.matched}
              total={mappingRows.length}
            />
            {mappingList.pageRows.length === 0 ? (
              <EmptyAction icon="search" title="No matching mappings" description="Try a different search." />
            ) : (
              <ImmRecordTable
                list={mappingList.controls}
                columns={[
                  { label: "Vaccine", sortKey: "vaccine_code" },
                  { label: "Data element", sortKey: "data_element_id" },
                  { label: "Label", sortKey: "label" },
                  { label: "Age band", sortKey: "age_band" },
                ]}
              >
                {mappingList.pageRows.map((row) => (
                  <ListPageDataTableRow key={String(row.uuid)}>
                    <ListPageDataTableCell className="pl-4 md:pl-6">
                      <ImmCodeChips codes={[String(row.vaccine_code)]} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell className="font-mono text-[12px]">{String(row.data_element_id)}</ListPageDataTableCell>
                    <ListPageDataTableCell>{String(row.label ?? "") || "—"}</ListPageDataTableCell>
                    <ListPageDataTableCell>{String(row.age_band ?? "") || "—"}</ListPageDataTableCell>
                  </ListPageDataTableRow>
                ))}
              </ImmRecordTable>
            )}
          </>
        )
      ) : null}

      {view === "packs" ? (
        schedules.length === 0 ? (
          <EmptyAction icon="book" title="No schedules to export" description="Create or import a schedule to share it as a pack." />
        ) : (
          <>
            <ImmSearchBar
              value={packList.query}
              onChange={packList.setQuery}
              placeholder="Search schedule"
              matched={packList.controls.matched}
              total={schedules.length}
              filters={
                <ImmFilterSelect label="Status" value={packStatus} onChange={setPackStatus}>
                  <option value="">Any status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </ImmFilterSelect>
              }
            />
            {packList.pageRows.length === 0 ? (
              <EmptyAction icon="search" title="No matching schedules" description="Change the search or status." />
            ) : (
              <ImmRecordTable
                list={packList.controls}
                columns={[{ label: "Schedule", sortKey: "name" }, { label: "Category", sortKey: "category" }, "Version", "Status", "Actions"]}
              >
                {packList.pageRows.map((schedule) => (
                  <ListPageDataTableRow key={schedule.uuid}>
                    <ListPageDataTableCell className="pl-4 md:pl-6">
                      <ImmPrimaryCell title={schedule.name} detail={schedule.is_example ? `${schedule.code} · example` : schedule.code} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>{humanize(schedule.category)}</ListPageDataTableCell>
                    <ListPageDataTableCell className="tabular-nums">
                      {schedule.published_version ? `v${schedule.published_version.number}` : "—"}
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <ImmStatusBadge status={schedule.published_version ? "published" : "draft"} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell className="pr-4 text-right md:pr-6">
                      <ImmRowAction
                        disabled={busy}
                        onClick={() =>
                          void attempt(async () => {
                            const pack = await exportOhImmPack(schedule.uuid);
                            const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
                            downloadBlob(blob, `${schedule.code || "schedule"}-pack.json`);
                          }, "Pack export failed")
                        }
                      >
                        Export
                      </ImmRowAction>
                    </ListPageDataTableCell>
                  </ListPageDataTableRow>
                ))}
              </ImmRecordTable>
            )}
          </>
        )
      ) : null}

      {view === "audit" ? (
        audits.isLoading ? (
          <QuietLoading />
        ) : auditRows.length === 0 ? (
          <EmptyAction
            icon="clipboard"
            title="No audit rows yet"
            description="Catalog, dose, certificate, and export actions appear here with codes and status only."
          />
        ) : (
          <>
            <ImmSearchBar
              value={auditList.query}
              onChange={auditList.setQuery}
              placeholder="Search entity, action, summary, or user"
              matched={auditList.controls.matched}
              total={auditRows.length}
              onClear={
                auditEntity || auditAction || auditList.query
                  ? () => {
                      setAuditEntity("");
                      setAuditAction("");
                      auditList.setQuery("");
                    }
                  : undefined
              }
              filters={
                <>
                  <ImmFilterSelect label="Record" value={auditEntity} onChange={setAuditEntity}>
                    <option value="">All records</option>
                    {distinct(auditRows, "entity_type").map((value) => (
                      <option key={value} value={value}>
                        {humanize(value)}
                      </option>
                    ))}
                  </ImmFilterSelect>
                  <ImmFilterSelect label="Action" value={auditAction} onChange={setAuditAction}>
                    <option value="">All actions</option>
                    {distinct(auditRows, "action").map((value) => (
                      <option key={value} value={value}>
                        {humanize(value)}
                      </option>
                    ))}
                  </ImmFilterSelect>
                </>
              }
            />
            {auditRows.length >= AUDIT_LIMIT ? (
              <p data-list-band className="border-b border-dash-border/80 bg-white px-4 py-1.5 text-[12px] text-dash-muted md:px-6">
                Showing the latest {AUDIT_LIMIT} audit rows.
              </p>
            ) : null}
            {auditList.pageRows.length === 0 ? (
              <EmptyAction icon="search" title="No matching audit rows" description="Change the search or filters." />
            ) : (
              <ImmRecordTable
                list={auditList.controls}
                columns={[
                  { label: "When", sortKey: "occurred_at" },
                  { label: "Record", sortKey: "entity_type" },
                  { label: "Action", sortKey: "action" },
                  "Summary",
                  { label: "By", sortKey: "actor_name" },
                ]}
              >
                {auditList.pageRows.map((row) => {
                  const when = auditWhen(row.occurred_at);
                  return (
                    <ListPageDataTableRow key={String(row.uuid)}>
                      <ListPageDataTableCell className="whitespace-nowrap pl-4 md:pl-6">
                        <ImmPrimaryCell title={when.day || "—"} detail={when.time} />
                      </ListPageDataTableCell>
                      <ListPageDataTableCell>{humanize(String(row.entity_type ?? ""))}</ListPageDataTableCell>
                      <ListPageDataTableCell>
                        <ImmStatusBadge status={String(row.action ?? "")} />
                      </ListPageDataTableCell>
                      <ListPageDataTableCell className="max-w-[28rem] truncate" title={String(row.summary ?? "")}>
                        {String(row.summary ?? "") || "—"}
                      </ListPageDataTableCell>
                      <ListPageDataTableCell>{String(row.actor_name ?? "") || "—"}</ListPageDataTableCell>
                    </ListPageDataTableRow>
                  );
                })}
              </ImmRecordTable>
            )}
          </>
        )
      ) : null}

      <Drawer open={sheet === "dhis"} title="DHIS2 aggregates" onClose={() => setSheet(null)}>
        <Field label="Period (YYYYMM)" required value={period} onChange={setPeriod} />
        <Field label="Org unit" required value={orgUnit} onChange={setOrgUnit} />
        <DrawerActions>
          <SecondaryButton type="button" onClick={() => setSheet(null)}>Cancel</SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={busy || !/^\d{6}$/.test(period) || !orgUnit.trim()}
            onClick={() =>
              void attempt(async () => {
                const { blob, filename } = await downloadOhImmDhisCsv(period, orgUnit);
                downloadBlob(blob, filename);
                setSheet(null);
              }, "DHIS2 export failed")
            }
          >
            Download CSV
          </PrimaryButton>
        </DrawerActions>
      </Drawer>

      <Drawer open={sheet === "certificate"} title="Vaccination certificate" onClose={() => setSheet(null)}>
        <CertificatePdfForm />
      </Drawer>

      <Drawer open={sheet === "mapping"} title="Add DHIS2 mapping" onClose={() => setSheet(null)}>
        <Field label="Vaccine code" required value={mapping.vaccine_code} onChange={(value) => setMapping((m) => ({ ...m, vaccine_code: value.toUpperCase() }))} />
        <Field label="Data element ID" required value={mapping.data_element_id} onChange={(value) => setMapping((m) => ({ ...m, data_element_id: value }))} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Label" value={mapping.label} onChange={(value) => setMapping((m) => ({ ...m, label: value }))} />
          <Field label="Age band" value={mapping.age_band} onChange={(value) => setMapping((m) => ({ ...m, age_band: value }))} />
        </div>
        <DrawerActions>
          <SecondaryButton type="button" onClick={() => setSheet(null)}>Cancel</SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={busy || !mapping.vaccine_code.trim() || !mapping.data_element_id.trim()}
            onClick={() =>
              void attempt(async () => {
                await createOhImmDhisMapping({
                  vaccine_code: mapping.vaccine_code.trim(),
                  data_element_id: mapping.data_element_id.trim(),
                  label: mapping.label.trim(),
                  age_band: mapping.age_band.trim(),
                  sex: "",
                });
                setMapping(EMPTY_MAPPING);
                setSheet(null);
                void queryClient.invalidateQueries({ queryKey: ["oh-imm-dhis-mappings"] });
                toast({ variant: "success", title: "Mapping saved" });
              }, "Could not save mapping")
            }
          >
            Save mapping
          </PrimaryButton>
        </DrawerActions>
      </Drawer>

      <Drawer
        wide
        open={sheet === "import"}
        title="Import schedule pack"
        description="Import never overwrites an edited schedule. It publishes a new version, and example packs stay labelled as examples."
        onClose={() => setSheet(null)}
      >
        <div className="space-y-1.5">
          <Label>
            Pack JSON
          </Label>
          <Textarea rows={14} className="font-mono text-[12px]" value={packJson} onChange={(e) => setPackJson(e.target.value)} />
        </div>
        <DrawerActions>
          <SecondaryButton type="button" onClick={() => setSheet(null)}>Cancel</SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={busy || !packJson.trim()}
            onClick={() =>
              void attempt(async () => {
                const pack = JSON.parse(packJson) as Record<string, unknown>;
                const result = await importOhImmPack(pack);
                void queryClient.invalidateQueries({ queryKey: ["oh-imm-schedules"] });
                void queryClient.invalidateQueries({ queryKey: ["oh-imm-audits"] });
                setPackJson("");
                setSheet(null);
                toast({ variant: "success", title: "Pack installed", description: String(result.notes || result.status || "Done") });
              }, "Pack import failed")
            }
          >
            Import pack
          </PrimaryButton>
        </DrawerActions>
      </Drawer>
    </>
  );
}
