"use client";

import { type ReactNode, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";

import { AppIcon } from "@/components/icons/app-icon";
import { PageActionButton, PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { ListPageDataTableCell, ListPageDataTableRow } from "@/features/app-shell/components/page-layout";
import { cn } from "@/lib/utils";
import { Drawer, DrawerActions } from "../shared/Drawer";
import { EmptyAction } from "../shared/EmptyAction";
import { Field, SelectField } from "../shared/Field";
import { ImmEmployeeLink } from "../shared/ImmEmployeeLink";
import { ImmInsightStrip } from "../shared/ImmInsightStrip";
import { ImmPrimaryCell, ImmRecordTable, ImmRowAction, ImmStatusBadge, humanize } from "../shared/ImmRecordTable";
import { ImmFilterSelect, ImmSearchBar } from "../shared/ImmSearchBar";
import { ImmNotice, ImmTabsBar } from "../shared/ImmTabsBar";
import { ImmAvatar, ImmCodeChips, ImmDateCell, ImmMeter } from "../shared/ImmVisuals";
import { LoadError, QuietLoading } from "../shared/QuietLoading";
import { useImmList } from "../shared/use-imm-list";
import { OhCopilotResult } from "@/features/occupational-health/components/OhCopilotResult";
import { draftBoardBrief, type CopilotResponse } from "@/features/occupational-health/services/visit-copilot.service";
import {
  createOhImmAccessClient,
  createOhImmBoardMember,
  createOhImmFitTest,
  decideOhImmAccommodation,
  fetchOhImmAccessClients,
  fetchOhImmAccommodations,
  fetchOhImmBoardMembers,
  fetchOhImmControls,
  fetchOhImmFitTestsDue,
  fetchOhImmTaskHierarchy,
  fetchOhImmTasks,
  fetchOhImmZoneClearance,
  fetchOhImmZones,
  fileOhImmDeclination,
  seedOhImmControls,
  seedOhImmZones,
} from "@/features/occupational-health/services/immunisation.service";

type GovernanceView = "zones" | "controls" | "fit" | "declinations" | "board" | "clients";
type GovernanceSheet = "fit" | "declination" | "board" | "client" | null;
type Row = Record<string, unknown>;

const EMPTY_FIT = { customer_uuid: "", respirator_model: "N95", result: "pass" };
const EMPTY_DECLINATION = { customer_uuid: "", vaccine_code: "HEPB", signed_by: "Employee" };
const EMPTY_MEMBER = { name: "", role: "member" };
const EMPTY_CLIENT = { name: "", webhook_url: "" };

const CONTROL_LEVELS = ["elimination", "substitution", "engineering", "administrative", "ppe", "immunization"] as const;
type ControlLevel = (typeof CONTROL_LEVELS)[number];
const CONTROL_LEVEL_LABEL: Record<ControlLevel, string> = {
  elimination: "Elimination",
  substitution: "Substitution",
  engineering: "Engineering",
  administrative: "Administrative",
  ppe: "PPE",
  immunization: "Immunization",
};
const MAX_RISK_SCORE = 25;

function asCodes(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

export function GovernanceControls() {
  const qc = useQueryClient();
  const zonesQ = useQuery({ queryKey: ["oh-imm-zones"], queryFn: fetchOhImmZones });
  const clientsQ = useQuery({ queryKey: ["oh-imm-access-clients"], queryFn: fetchOhImmAccessClients });
  const controlsQ = useQuery({ queryKey: ["oh-imm-controls"], queryFn: fetchOhImmControls });
  const tasksQ = useQuery({ queryKey: ["oh-imm-tasks"], queryFn: fetchOhImmTasks });
  const boardQ = useQuery({ queryKey: ["oh-imm-board"], queryFn: fetchOhImmBoardMembers });
  const accQ = useQuery({ queryKey: ["oh-imm-accommodations"], queryFn: () => fetchOhImmAccommodations() });
  const fitDueQ = useQuery({ queryKey: ["oh-imm-fit-due"], queryFn: () => fetchOhImmFitTestsDue(45) });

  const [view, setView] = useState<GovernanceView>("zones");
  const [sheet, setSheet] = useState<GovernanceSheet>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [secretOnce, setSecretOnce] = useState("");
  const [clearanceZone, setClearanceZone] = useState<Row | null>(null);
  const [clearance, setClearance] = useState<Row[]>([]);
  const [hierarchy, setHierarchy] = useState<Row | null>(null);
  const [fit, setFit] = useState(EMPTY_FIT);
  const [declination, setDeclination] = useState(EMPTY_DECLINATION);
  const [member, setMember] = useState(EMPTY_MEMBER);
  const [client, setClient] = useState(EMPTY_CLIENT);
  const [controlLevel, setControlLevel] = useState<ControlLevel | "">("");
  const [boardStatus, setBoardStatus] = useState("");
  const [brief, setBrief] = useState<{ title: string; pending: boolean; error: string; result: CopilotResponse | null } | null>(null);

  const zones = zonesQ.data ?? [];
  const controls = controlsQ.data ?? [];
  const tasks = tasksQ.data ?? [];
  const fitDue = fitDueQ.data ?? [];
  const accommodations = accQ.data ?? [];
  const board = boardQ.data ?? [];
  const clients = clientsQ.data ?? [];

  const zoneList = useImmList<Row>({
    rows: zones,
    searchText: (zone) =>
      [zone.name, zone.code, ...asCodes(zone.required_vaccine_codes), ...asCodes(zone.required_control_codes)].join(" "),
    sortValue: (zone, key) => (key === "valid" ? Number(zone.clearance_valid_days ?? 0) : String(zone.name ?? "")),
    defaultSort: { key: "name", direction: "asc" },
  });
  const controlList = useImmList<Row>({
    rows: controlLevel ? controls.filter((control) => control.level === controlLevel) : controls,
    searchText: (control) => [control.name, control.code, control.level].join(" "),
    sortValue: (control, key) =>
      key === "level"
        ? CONTROL_LEVELS.indexOf(String(control.level) as ControlLevel)
        : key === "delta"
          ? Number(control.residual_risk_delta ?? 0)
          : String(control.name ?? ""),
    defaultSort: { key: "level", direction: "asc" },
  });
  const fitList = useImmList<Row>({
    rows: fitDue,
    searchText: (row) => [row.customer_uuid, row.respirator_model, row.result].join(" "),
    sortValue: (row, key) => String(row[key] ?? ""),
    defaultSort: { key: "expires_on", direction: "asc" },
  });
  const accList = useImmList<Row>({
    rows: boardStatus ? accommodations.filter((item) => item.board_status === boardStatus) : accommodations,
    searchText: (item) => [item.customer_uuid, item.vaccine_code, item.decision].join(" "),
    sortValue: (item, key) => String(item[key] ?? ""),
  });
  const boardList = useImmList<Row>({
    rows: board,
    searchText: (row) => [row.name, row.role].join(" "),
    sortValue: (row, key) => String(row[key] ?? ""),
    defaultSort: { key: "name", direction: "asc" },
  });
  const clientList = useImmList<Row>({
    rows: clients,
    searchText: (row) => [row.name, row.client_key, row.webhook_url].join(" "),
    sortValue: (row, key) => String(row[key] ?? ""),
    defaultSort: { key: "name", direction: "asc" },
  });

  const loading = zonesQ.isLoading || clientsQ.isLoading || controlsQ.isLoading || boardQ.isLoading || accQ.isLoading || fitDueQ.isLoading;
  const errored = zonesQ.isError || clientsQ.isError || controlsQ.isError || boardQ.isError || accQ.isError || fitDueQ.isError;

  if (loading) return <QuietLoading />;
  if (errored) return <LoadError>Could not load governance data. Check your connection and try again.</LoadError>;

  const pendingDecisions = accommodations.filter((item) => item.board_status === "pending").length;
  const failedFits = fitDue.filter((row) => row.result === "fail").length;
  const levelCounts = new Map<string, number>();
  for (const control of controls) levelCounts.set(String(control.level), (levelCounts.get(String(control.level)) ?? 0) + 1);
  const clearanceCounts = { cleared: 0, not_cleared: 0, expiring: 0 } as Record<string, number>;
  for (const row of clearance) clearanceCounts[String(row.status)] = (clearanceCounts[String(row.status)] ?? 0) + 1;

  async function run(action: () => Promise<unknown>, done: string, queryKey: string, close = true) {
    setBusy(true);
    try {
      await action();
      setMsg(done);
      if (close) setSheet(null);
      void qc.invalidateQueries({ queryKey: [queryKey] });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function openClearance(zone: Row) {
    setClearanceZone(zone);
    setClearance([]);
    void fetchOhImmZoneClearance(String(zone.uuid))
      .then(setClearance)
      .catch((e: Error) => setMsg(e.message));
  }

  const actions: Record<GovernanceView, ReactNode> = {
    zones: (
      <SecondaryButton
        type="button"
        className="h-8"
        disabled={busy}
        onClick={() => void run(seedOhImmZones, "Example zones loaded.", "oh-imm-zones", false)}
      >
        Load example zones
      </SecondaryButton>
    ),
    controls: (
      <SecondaryButton
        type="button"
        className="h-8"
        disabled={busy}
        onClick={() => void run(seedOhImmControls, "Default controls loaded.", "oh-imm-controls", false)}
      >
        Load default controls
      </SecondaryButton>
    ),
    fit: (
      <PageActionButton type="button" onClick={() => setSheet("fit")}>
        <AppIcon name="add" className="size-3.5" />
        Record fit test
      </PageActionButton>
    ),
    declinations: (
      <PageActionButton type="button" onClick={() => setSheet("declination")}>
        <AppIcon name="add" className="size-3.5" />
        File declination
      </PageActionButton>
    ),
    board: (
      <PageActionButton type="button" onClick={() => setSheet("board")}>
        <AppIcon name="add" className="size-3.5" />
        Add member
      </PageActionButton>
    ),
    clients: (
      <PageActionButton type="button" onClick={() => setSheet("client")}>
        <AppIcon name="add" className="size-3.5" />
        Create client
      </PageActionButton>
    ),
  };

  return (
    <>
      <ImmTabsBar
        testId="oh-imm-governance-panel"
        label="Governance records"
        active={view}
        onChange={setView}
        tabs={[
          { key: "zones", label: "Zones", count: zones.length },
          { key: "controls", label: "Controls", count: controls.length },
          { key: "fit", label: "Fit tests due", count: fitDue.length },
          { key: "declinations", label: "Declinations", count: accommodations.length },
          { key: "board", label: "Medical board", count: board.length },
          { key: "clients", label: "Access clients", count: clients.length },
        ]}
        actions={actions[view]}
      />
      {secretOnce ? (
        <ImmNotice tone="warning">
          Client secret, shown once only: <span className="font-mono">{secretOnce}</span>
        </ImmNotice>
      ) : null}
      {msg ? <ImmNotice>{msg}</ImmNotice> : null}

      <ImmInsightStrip
        testId="oh-imm-governance-insights"
        items={[
          {
            label: "fit tests due",
            value: fitDue.length,
            hint: "next 45 days",
            tone: fitDue.length > 0 ? "warning" : "default",
            onSelect: () => setView("fit"),
            active: view === "fit",
          },
          {
            label: "failed fit tests",
            value: failedFits,
            tone: failedFits > 0 ? "danger" : "default",
            onSelect: () => setView("fit"),
          },
          {
            label: "awaiting board decision",
            value: pendingDecisions,
            tone: pendingDecisions > 0 ? "warning" : "default",
            onSelect: () => {
              setView("declinations");
              setBoardStatus((current) => (current === "pending" ? "" : "pending"));
            },
            active: view === "declinations" && boardStatus === "pending",
          },
          {
            label: "board chair",
            value: board.some((row) => row.role === "chair") ? "Assigned" : "Missing",
            tone: board.some((row) => row.role === "chair") ? "success" : "danger",
            onSelect: () => setView("board"),
          },
          {
            label: "clients never used",
            value: clients.filter((row) => !row.last_used_at).length,
            onSelect: () => setView("clients"),
          },
        ]}
      />

      {view === "zones" ? (
        zones.length === 0 ? (
          <EmptyAction
            icon="building"
            title="No zones yet"
            description="Add labs, clean rooms, or wards with required vaccines and risk controls."
          />
        ) : (
          <>
            <ImmSearchBar
              value={zoneList.query}
              onChange={zoneList.setQuery}
              placeholder="Search zone, vaccine, or control"
              matched={zoneList.controls.matched}
              total={zones.length}
            />
            {zoneList.pageRows.length === 0 ? (
              <EmptyAction icon="search" title="No matching zones" description="Try a different search." />
            ) : (
              <ImmRecordTable
                list={zoneList.controls}
                columns={[
                  { label: "Zone", sortKey: "name" },
                  "Required vaccines",
                  "Required titres",
                  "Required controls",
                  { label: "Valid for", sortKey: "valid", align: "right" },
                  "Actions",
                ]}
              >
                {zoneList.pageRows.map((zone) => (
                  <ListPageDataTableRow key={String(zone.uuid)} className="cursor-pointer" onClick={() => openClearance(zone)}>
                    <ListPageDataTableCell className="pl-4 md:pl-6">
                      <ImmPrimaryCell title={String(zone.name)} detail={String(zone.code)} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <ImmCodeChips codes={asCodes(zone.required_vaccine_codes)} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <ImmCodeChips codes={asCodes(zone.required_titre_codes)} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <ImmCodeChips codes={asCodes(zone.required_control_codes)} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell className="text-right tabular-nums">
                      {zone.clearance_valid_days != null ? `${String(zone.clearance_valid_days)} days` : "—"}
                    </ListPageDataTableCell>
                    <ListPageDataTableCell className="pr-4 text-right md:pr-6">
                      <ImmRowAction onClick={() => openClearance(zone)}>View clearance</ImmRowAction>
                    </ListPageDataTableCell>
                  </ListPageDataTableRow>
                ))}
              </ImmRecordTable>
            )}
          </>
        )
      ) : null}

      {view === "controls" ? (
        controls.length === 0 ? (
          <EmptyAction icon="shield" title="No controls yet" description="Load default controls for the hierarchy, from elimination to PPE." />
        ) : (
          <>
            <div
              data-list-band
              role="group"
              aria-label="Hierarchy of controls"
              className="flex flex-wrap items-center gap-1 border-b border-dash-border/80 bg-white px-4 py-3 md:px-6"
            >
              <span className="mr-2 text-[11px] font-semibold uppercase tracking-wide text-dash-muted">Most effective</span>
              {CONTROL_LEVELS.map((level, index) => (
                <span key={level} className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    aria-pressed={controlLevel === level}
                    onClick={() => setControlLevel((current) => (current === level ? "" : level))}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] transition-colors",
                      controlLevel === level
                        ? "border-brand-primary bg-brand-tint text-brand-navy"
                        : "border-dash-border text-brand-slate hover:bg-dash-canvas",
                    )}
                  >
                    {CONTROL_LEVEL_LABEL[level]}
                    <span className="tabular-nums text-dash-muted">{levelCounts.get(level) ?? 0}</span>
                  </button>
                  {index < CONTROL_LEVELS.length - 1 ? <ChevronRight aria-hidden className="size-3.5 text-dash-muted" /> : null}
                </span>
              ))}
              <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-dash-muted">Least effective</span>
            </div>
            <ImmSearchBar
              value={controlList.query}
              onChange={controlList.setQuery}
              placeholder="Search control"
              matched={controlList.controls.matched}
              total={controls.length}
              onClear={
                controlLevel || controlList.query
                  ? () => {
                      setControlLevel("");
                      controlList.setQuery("");
                    }
                  : undefined
              }
              filters={
                <ImmFilterSelect
                  label="Task hierarchy"
                  value=""
                  onChange={(taskUuid) => {
                    if (taskUuid) {
                      void fetchOhImmTaskHierarchy(taskUuid)
                        .then(setHierarchy)
                        .catch((err: Error) => setMsg(err.message));
                    }
                  }}
                >
                  <option value="">View hierarchy for task…</option>
                  {tasks.map((task) => (
                    <option key={task.uuid} value={task.uuid}>
                      {task.code}
                    </option>
                  ))}
                </ImmFilterSelect>
              }
            />
            {controlList.pageRows.length === 0 ? (
              <EmptyAction icon="search" title="No matching controls" description="Change the level or search." />
            ) : (
              <ImmRecordTable
                list={controlList.controls}
                columns={[
                  { label: "Control", sortKey: "name" },
                  { label: "Level", sortKey: "level" },
                  { label: "Residual reduction", sortKey: "delta" },
                ]}
              >
                {controlList.pageRows.map((control) => {
                  const delta = Number(control.residual_risk_delta ?? 0);
                  return (
                    <ListPageDataTableRow key={String(control.uuid)}>
                      <ListPageDataTableCell className="pl-4 md:pl-6">
                        <ImmPrimaryCell title={String(control.name)} detail={String(control.code)} />
                      </ListPageDataTableCell>
                      <ListPageDataTableCell>
                        {CONTROL_LEVEL_LABEL[String(control.level) as ControlLevel] ?? humanize(String(control.level ?? ""))}
                      </ListPageDataTableCell>
                      <ListPageDataTableCell>
                        {control.residual_risk_delta != null ? (
                          <ImmMeter value={delta} max={MAX_RISK_SCORE} label={`−${delta}`} tone="success" />
                        ) : (
                          "—"
                        )}
                      </ListPageDataTableCell>
                    </ListPageDataTableRow>
                  );
                })}
              </ImmRecordTable>
            )}
          </>
        )
      ) : null}

      {view === "fit" ? (
        fitDue.length === 0 ? (
          <EmptyAction icon="shield" title="No fit tests due" description="Respirator fit tests expiring in the next 45 days appear here." />
        ) : (
          <>
            <ImmSearchBar
              value={fitList.query}
              onChange={fitList.setQuery}
              placeholder="Search employee or respirator"
              matched={fitList.controls.matched}
              total={fitDue.length}
            />
            <ImmRecordTable
              list={fitList.controls}
              columns={[
                { label: "Employee", sortKey: "customer_uuid" },
                { label: "Respirator", sortKey: "respirator_model" },
                { label: "Last result", sortKey: "result" },
                { label: "Expires", sortKey: "expires_on" },
                "Status",
              ]}
            >
              {fitList.pageRows.map((row) => (
                <ListPageDataTableRow key={String(row.uuid)}>
                  <ListPageDataTableCell className="pl-4 md:pl-6">
                    <ImmEmployeeLink uuid={String(row.customer_uuid ?? "")} />
                  </ListPageDataTableCell>
                  <ListPageDataTableCell>{String(row.respirator_model ?? "—")}</ListPageDataTableCell>
                  <ListPageDataTableCell>
                    {row.result ? <ImmStatusBadge status={String(row.result)} /> : "—"}
                  </ListPageDataTableCell>
                  <ListPageDataTableCell>
                    <ImmDateCell date={(row.expires_on as string | null) ?? null} warnWithinDays={45} />
                  </ListPageDataTableCell>
                  <ListPageDataTableCell>
                    <ImmStatusBadge status={String(row.status ?? "due")} />
                  </ListPageDataTableCell>
                </ListPageDataTableRow>
              ))}
            </ImmRecordTable>
          </>
        )
      ) : null}

      {view === "declinations" ? (
        accommodations.length === 0 ? (
          <EmptyAction
            icon="file"
            title="No declinations on file"
            description="Informed, non-punitive declinations go to the medical board for a decision."
          />
        ) : (
          <>
            <ImmSearchBar
              value={accList.query}
              onChange={accList.setQuery}
              placeholder="Search employee or vaccine"
              matched={accList.controls.matched}
              total={accommodations.length}
              filters={
                <ImmFilterSelect label="Board status" value={boardStatus} onChange={setBoardStatus}>
                  <option value="">Any status</option>
                  <option value="pending">Pending ({pendingDecisions})</option>
                  <option value="decided">Decided</option>
                </ImmFilterSelect>
              }
            />
            {accList.pageRows.length === 0 ? (
              <EmptyAction icon="search" title="No matching declinations" description="Change the search or board status." />
            ) : (
              <ImmRecordTable
                list={accList.controls}
                columns={[
                  { label: "Employee", sortKey: "customer_uuid" },
                  { label: "Vaccine", sortKey: "vaccine_code" },
                  { label: "Board status", sortKey: "board_status" },
                  { label: "Decision", sortKey: "decision" },
                  "Actions",
                ]}
              >
                {accList.pageRows.map((item) => (
                  <ListPageDataTableRow key={String(item.uuid)}>
                    <ListPageDataTableCell className="pl-4 md:pl-6">
                      <ImmEmployeeLink uuid={String(item.customer_uuid ?? "")} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <ImmCodeChips codes={item.vaccine_code ? [String(item.vaccine_code)] : []} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <ImmStatusBadge status={String(item.board_status ?? "")} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>{item.decision ? humanize(String(item.decision)) : "—"}</ListPageDataTableCell>
                    <ListPageDataTableCell className="pr-4 text-right md:pr-6">
                      <span className="inline-flex gap-3">
                        <ImmRowAction
                          onClick={() => {
                            const title = `Board brief · ${String(item.vaccine_code ?? "")}`;
                            setBrief({ title, pending: true, error: "", result: null });
                            void draftBoardBrief(String(item.uuid))
                              .then((result) => setBrief({ title, pending: false, error: "", result }))
                              .catch((caught: Error) => setBrief({ title, pending: false, error: caught.message, result: null }));
                          }}
                        >
                          Board brief
                        </ImmRowAction>
                      {item.board_status === "pending" ? (
                        <ImmRowAction
                          disabled={busy}
                          onClick={() =>
                            void run(
                              () =>
                                decideOhImmAccommodation(String(item.uuid), {
                                  decision: "specialized_ppe",
                                  decided_by: "board",
                                  conditions: "PPE plan",
                                }),
                              "Approved with PPE plan.",
                              "oh-imm-accommodations",
                              false,
                            )
                          }
                        >
                          Approve PPE
                        </ImmRowAction>
                      ) : null}
                      </span>
                    </ListPageDataTableCell>
                  </ListPageDataTableRow>
                ))}
              </ImmRecordTable>
            )}
          </>
        )
      ) : null}

      {view === "board" ? (
        board.length === 0 ? (
          <EmptyAction icon="users" title="No board members" description="Add the chair and members who decide on declinations." />
        ) : (
          <>
            <ImmSearchBar
              value={boardList.query}
              onChange={boardList.setQuery}
              placeholder="Search member"
              matched={boardList.controls.matched}
              total={board.length}
            />
            <ImmRecordTable
              list={boardList.controls}
              columns={[
                { label: "Name", sortKey: "name" },
                { label: "Role", sortKey: "role" },
              ]}
            >
              {boardList.pageRows.map((row) => (
                <ListPageDataTableRow key={String(row.uuid)}>
                  <ListPageDataTableCell className="pl-4 md:pl-6">
                    <span className="inline-flex items-center gap-2 font-medium text-brand-navy">
                      <ImmAvatar text={String(row.name ?? "")} />
                      {String(row.name)}
                    </span>
                  </ListPageDataTableCell>
                  <ListPageDataTableCell>
                    {row.role === "chair" ? <ImmStatusBadge status="published" label="Chair" /> : humanize(String(row.role ?? ""))}
                  </ListPageDataTableCell>
                </ListPageDataTableRow>
              ))}
            </ImmRecordTable>
          </>
        )
      ) : null}

      {view === "clients" ? (
        clients.length === 0 ? (
          <EmptyAction
            icon="settings"
            title="No access clients"
            description="Create a signed client for HR or access-card systems. The secret is shown once."
          />
        ) : (
          <>
            <ImmSearchBar
              value={clientList.query}
              onChange={clientList.setQuery}
              placeholder="Search client or key"
              matched={clientList.controls.matched}
              total={clients.length}
            />
            <ImmRecordTable
              list={clientList.controls}
              columns={[
                { label: "Client", sortKey: "name" },
                "Key",
                "Webhook",
                { label: "Last used", sortKey: "last_used_at" },
              ]}
            >
              {clientList.pageRows.map((row) => (
                <ListPageDataTableRow key={String(row.uuid)}>
                  <ListPageDataTableCell className="pl-4 font-medium text-brand-navy md:pl-6">{String(row.name)}</ListPageDataTableCell>
                  <ListPageDataTableCell className="font-mono text-[12px]">{String(row.client_key)}</ListPageDataTableCell>
                  <ListPageDataTableCell className="max-w-[18rem] truncate">
                    {row.has_webhook ? String(row.webhook_url) : <span className="text-dash-muted">Not configured</span>}
                  </ListPageDataTableCell>
                  <ListPageDataTableCell className="whitespace-nowrap">
                    {row.last_used_at ? (
                      <ImmDateCell date={String(row.last_used_at)} pastIsBad={false} />
                    ) : (
                      <span className="text-dash-muted">Never</span>
                    )}
                  </ListPageDataTableCell>
                </ListPageDataTableRow>
              ))}
            </ImmRecordTable>
          </>
        )
      ) : null}

      {clearanceZone ? (
        <Drawer
          wide
          title={`Clearance · ${String(clearanceZone.name)}`}
          description="Cleared, not cleared, or expiring with a valid-until date only. No clinical detail is shared."
          onClose={() => setClearanceZone(null)}
        >
          {clearance.length === 0 ? (
            <p className="text-[13px] text-dash-muted">No employees evaluated for this zone yet.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 text-[12px]">
                {(["cleared", "expiring", "not_cleared"] as const).map((status) => (
                  <span key={status} className="inline-flex items-center gap-1.5">
                    <ImmStatusBadge status={status} />
                    <span className="tabular-nums text-dash-muted">{clearanceCounts[status] ?? 0}</span>
                  </span>
                ))}
              </div>
              <ul className="divide-y divide-dash-border/70 border-y border-dash-border/70 text-[13px]">
                {clearance.map((row) => (
                  <li key={String(row.customer_uuid)} className="flex items-center justify-between gap-3 py-2">
                    <ImmEmployeeLink uuid={String(row.customer_uuid ?? "")} />
                    <span className="flex items-center gap-3">
                      <ImmDateCell date={(row.valid_until as string | null) ?? null} warnWithinDays={30} />
                      <ImmStatusBadge status={String(row.status ?? "")} />
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Drawer>
      ) : null}

      {hierarchy ? (
        <Drawer
          title="Task hierarchy of controls"
          description={`Inherent ${String(hierarchy.inherent_score)} → residual ${String(hierarchy.residual_score)} (${String(hierarchy.band)})`}
          onClose={() => setHierarchy(null)}
        >
          {Object.entries((hierarchy.levels as Record<string, Row[]>) ?? {}).map(([level, items]) => (
            <div key={level} className="space-y-1 border-b border-dash-border/70 pb-3 last:border-b-0">
              <p className="text-[13px] font-medium text-brand-navy">{humanize(level)}</p>
              {items.length === 0 ? (
                <p className="text-[13px] text-dash-muted">No controls at this level.</p>
              ) : (
                items.map((item) => (
                  <p key={String(item.uuid)} className="text-[13px] text-brand-slate">
                    {String(item.name)} <span className="text-dash-muted">(−{String(item.residual_risk_delta)})</span>
                  </p>
                ))
              )}
            </div>
          ))}
        </Drawer>
      ) : null}

      <Drawer open={sheet === "fit"} title="Record fit test" onClose={() => setSheet(null)}>
        <Field label="Employee ID" required value={fit.customer_uuid} onChange={(value) => setFit((f) => ({ ...f, customer_uuid: value }))} />
        <Field label="Respirator model" required value={fit.respirator_model} onChange={(value) => setFit((f) => ({ ...f, respirator_model: value }))} />
        <SelectField label="Result" required value={fit.result} onChange={(value) => setFit((f) => ({ ...f, result: value }))}>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
        </SelectField>
        <DrawerActions>
          <SecondaryButton type="button" onClick={() => setSheet(null)}>Cancel</SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={busy || !fit.customer_uuid.trim() || !fit.respirator_model.trim()}
            onClick={() =>
              void run(
                () => createOhImmFitTest({ ...fit, tested_by: "OH" }).then(() => setFit(EMPTY_FIT)),
                "Fit test saved.",
                "oh-imm-fit-due",
              )
            }
          >
            Save fit test
          </PrimaryButton>
        </DrawerActions>
      </Drawer>

      <Drawer
        open={sheet === "declination"}
        title="File declination"
        description="The employee signs an informed declination. The medical board then decides on accommodations."
        onClose={() => setSheet(null)}
      >
        <Field label="Employee ID" required value={declination.customer_uuid} onChange={(value) => setDeclination((d) => ({ ...d, customer_uuid: value }))} />
        <Field label="Vaccine code" required value={declination.vaccine_code} onChange={(value) => setDeclination((d) => ({ ...d, vaccine_code: value.toUpperCase() }))} />
        <Field label="Signed by" required value={declination.signed_by} onChange={(value) => setDeclination((d) => ({ ...d, signed_by: value }))} />
        <DrawerActions>
          <SecondaryButton type="button" onClick={() => setSheet(null)}>Cancel</SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={busy || !declination.customer_uuid.trim() || !declination.vaccine_code.trim()}
            onClick={() =>
              void run(
                () => fileOhImmDeclination({ ...declination, informed_signed: true }).then(() => setDeclination(EMPTY_DECLINATION)),
                "Declination filed.",
                "oh-imm-accommodations",
              )
            }
          >
            File declination
          </PrimaryButton>
        </DrawerActions>
      </Drawer>

      <Drawer open={sheet === "board"} title="Add board member" onClose={() => setSheet(null)}>
        <Field label="Name" required value={member.name} onChange={(value) => setMember((m) => ({ ...m, name: value }))} />
        <SelectField label="Role" required value={member.role} onChange={(value) => setMember((m) => ({ ...m, role: value }))}>
          <option value="chair">Chair</option>
          <option value="member">Member</option>
        </SelectField>
        <DrawerActions>
          <SecondaryButton type="button" onClick={() => setSheet(null)}>Cancel</SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={busy || !member.name.trim()}
            onClick={() => void run(() => createOhImmBoardMember(member).then(() => setMember(EMPTY_MEMBER)), "Board member added.", "oh-imm-board")}
          >
            Add member
          </PrimaryButton>
        </DrawerActions>
      </Drawer>

      <Drawer
        open={sheet === "client"}
        title="Create access client"
        description="HR or access-card systems sign requests with this client. The secret is shown once after creation."
        onClose={() => setSheet(null)}
      >
        <Field label="Name" required value={client.name} onChange={(value) => setClient((c) => ({ ...c, name: value }))} />
        <Field label="Webhook URL" type="url" placeholder="https://" value={client.webhook_url} onChange={(value) => setClient((c) => ({ ...c, webhook_url: value }))} />
        <DrawerActions>
          <SecondaryButton type="button" onClick={() => setSheet(null)}>Cancel</SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={busy || !client.name.trim()}
            onClick={() =>
              void run(
                () =>
                  createOhImmAccessClient(client).then((result) => {
                    setSecretOnce(result.secret);
                    setClient(EMPTY_CLIENT);
                  }),
                "Access client created.",
                "oh-imm-access-clients",
              )
            }
          >
            Create client
          </PrimaryButton>
        </DrawerActions>
      </Drawer>
      {brief ? (
        <Drawer title={brief.title} onClose={() => setBrief(null)}>
          {brief.pending ? <p className="text-[13px] text-dash-muted">Drafting…</p> : null}
          {brief.error ? <p className="text-[13px] text-red-700">{brief.error}</p> : null}
          {brief.result ? <OhCopilotResult result={brief.result} /> : null}
        </Drawer>
      ) : null}
    </>
  );
}
