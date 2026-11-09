"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ListPageHeaderSection,
  ListPageLayout,
} from "@/features/app-shell/components/page-layout";
import {
  createOhImmLot,
  createOhImmSchedule,
  createOhImmVaccine,
  createOhImmDhisMapping,
  downloadOhImmCertificatePdf,
  fetchOhImmPathways,
  createOhImmPathway,
  fetchOhImmTasks,
  createOhImmTask,
  assignOhImmTask,
  seedOhImmRiskExamples,
  fetchOhImmNrProtocols,
  createOhImmNrProtocol,
  seedOhImmNrHepb,
  type OhImmPathway,
  type OhImmTask,
  type OhImmNrProtocol,
  fetchOhImmExposures,
  createOhImmExposure,
  recordOhImmExposureAction,
  updateOhImmExposureSource,
  fetchOhImmExposureDueFollowups,
  completeOhImmExposureFollowup,
  fetchOhImmExposureOncall,
  createOhImmExposureOncall,
  seedOhImmExposureTypes,
  type OhImmExposure,
  fetchOhImmZones,
  seedOhImmZones,
  fetchOhImmZoneClearance,
  fetchOhImmAccessClients,
  createOhImmAccessClient,
  seedOhImmControls,
  fetchOhImmControls,
  fetchOhImmTaskHierarchy,
  createOhImmFitTest,
  fetchOhImmFitTestsDue,
  fetchOhImmBoardMembers,
  createOhImmBoardMember,
  fetchOhImmAccommodations,
  fileOhImmDeclination,
  decideOhImmAccommodation,
  fetchOhImmPdca,
  updateOhImmRca,
  addOhImmRcaAction,
  fetchOhImmSeroAudits,
  createOhImmSeroAudit,
  recordOhImmSeroAggregates,
  fetchOhImmVendors,
  createOhImmVendor,
  recordOhImmColdChain,
  clearOhImmLotQuarantine,
  fetchOhImmTasks,
  issueOhImmCertificate,
  downloadOhImmComplianceCsv,
  downloadOhImmDhisCsv,
  downloadOhImmFhirNdjson,
  exportOhImmPack,
  fetchOhImmAudits,
  fetchOhImmCompliance,
  fetchOhImmDhisMappings,
  fetchOhImmDueFiltered,
  fetchOhImmLots,
  fetchOhImmSchedules,
  fetchOhImmVaccines,
  importOhImmPack,
  previewOhImmAssignment,
  publishOhImmSchedule,
  remindOhImm,
  seedOhImmExamples,
  type OhImmSchedule,
  type OhImmStatus,
  type OhVaccine,
  type OhVaccineLot,
} from "@/features/occupational-health/services/immunisation.service";
import { useToast } from "@/providers/toast-provider";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

export type HubTab = "due" | "catalog" | "schedules" | "compliance" | "tools" | "risk" | "exposures" | "governance" | "pdca";

const STATUS_LABEL: Record<string, string> = {
  up_to_date: "Up to date",
  due: "Due",
  overdue: "Overdue",
  exempt: "Exempt",
  non_responder: "Non-responder",
};

export function OhImmunizationsHubPage({
  initialTab = "due",
}: {
  initialTab?: HubTab;
} = {}) {
  const [tab, setTab] = useState<HubTab>(initialTab);
  const router = useRouter();
  const tabHref: Record<HubTab, string> = {
    due: ROUTES.immunizationsDue,
    catalog: ROUTES.immunizationsVaccines,
    schedules: ROUTES.immunizationsSchedules,
    compliance: ROUTES.immunizationsCompliance,
    risk: ROUTES.immunizationsRisk,
    exposures: ROUTES.immunizationsExposures,
    governance: ROUTES.immunizationsGovernance,
    pdca: ROUTES.immunizationsPdca,
    tools: ROUTES.immunizationsExports,
  };
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const due = useQuery({
    queryKey: ["oh-imm-due"],
    queryFn: () => fetchOhImmDueFiltered(14),
  });
  const vaccines = useQuery({
    queryKey: ["oh-imm-vaccines"],
    queryFn: fetchOhImmVaccines,
  });
  const lots = useQuery({
    queryKey: ["oh-imm-lots"],
    queryFn: () => fetchOhImmLots(),
  });
  const schedules = useQuery({
    queryKey: ["oh-imm-schedules"],
    queryFn: fetchOhImmSchedules,
  });
  const compliance = useQuery({
    queryKey: ["oh-imm-compliance", "employer"],
    queryFn: () => fetchOhImmCompliance("employer"),
    enabled: tab === "compliance",
  });

  const seed = useMutation({
    mutationFn: seedOhImmExamples,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["oh-imm-vaccines"] });
      void queryClient.invalidateQueries({ queryKey: ["oh-imm-schedules"] });
      toast({
        variant: "success",
        title: "Example packs loaded",
        description: "Editable examples only — review before clinical use.",
      });
    },
    onError: (error) =>
      toast({
        variant: "error",
        title: "Could not load examples",
        description: error instanceof Error ? error.message : "Try again.",
      }),
  });

  return (
    <ListPageLayout data-testid="oh-immunizations-page">
      <ListPageHeaderSection>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-brand-navy">Immunizations</h1>
            <p className="text-[13px] text-dash-muted">
              Due worklist, schedules with assignment rules, titres, and compliance.
            </p>
          </div>
          <SecondaryButton
            type="button"
            disabled={seed.isPending}
            onClick={() => seed.mutate()}
          >
            {seed.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Loading…
              </>
            ) : (
              "Load example packs"
            )}
          </SecondaryButton>
        </div>
        <nav
          aria-label="Immunization sections"
          className="mt-4 flex items-center gap-5 border-b border-dash-border/70"
        >
          {(
            [
              ["due", "Due / overdue"],
              ["catalog", "Vaccines & lots"],
              ["schedules", "Schedules"],
              ["compliance", "Compliance"],
              ["risk", "Risk & tasks"],
              ["exposures", "Exposures"],
              ["governance", "Governance"],
              ["pdca", "PDCA"],
              ["tools", "Exports & audit"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => { setTab(id); router.push(tabHref[id]); }}
              className={cn(
                "relative -mb-px pb-2.5 text-sm",
                tab === id
                  ? "font-medium text-brand-navy"
                  : "text-dash-muted hover:text-brand-navy",
              )}
            >
              {label}
              {tab === id ? (
                <span className="absolute inset-x-0 bottom-0 h-px bg-brand-navy" />
              ) : null}
            </button>
          ))}
        </nav>
      </ListPageHeaderSection>

      {tab === "due" ? (
        <DuePanel rows={due.data ?? []} loading={due.isLoading} />
      ) : null}
      {tab === "catalog" ? (
        <CatalogPanel
          vaccines={vaccines.data ?? []}
          lots={lots.data ?? []}
          loading={vaccines.isLoading || lots.isLoading}
        />
      ) : null}
      {tab === "schedules" ? (
        <SchedulesPanel
          schedules={schedules.data ?? []}
          loading={schedules.isLoading}
        />
      ) : null}
      {tab === "compliance" ? (
        <CompliancePanel
          data={compliance.data}
          loading={compliance.isLoading}
        />
      ) : null}
      {tab === "risk" ? <RiskPanel /> : null}
      {tab === "exposures" ? <ExposuresPanel /> : null}
      {tab === "governance" ? <GovernancePanel /> : null}
      {tab === "pdca" ? <PdcaPanel /> : null}
      {tab === "tools" ? <ToolsPanel schedules={schedules.data ?? []} /> : null}
    </ListPageLayout>
  );
}

function DuePanel({
  rows,
  loading,
}: {
  rows: OhImmStatus[];
  loading: boolean;
}) {
  const expFollowups = useQuery({
    queryKey: ["oh-imm-exp-followups-due"],
    queryFn: () => fetchOhImmExposureDueFollowups(14),
  });
  const fitDueInDue = useQuery({
    queryKey: ["oh-imm-fit-due-in-due"],
    queryFn: () => fetchOhImmFitTestsDue(30),
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [employer, setEmployer] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");

  const filteredQuery = useQuery({
    queryKey: ["oh-imm-due-filtered", employer, department, status],
    queryFn: () =>
      fetchOhImmDueFiltered(30, {
        employer,
        department,
        status,
      }),
  });
  const list = filteredQuery.data ?? rows;

  const remind = useMutation({
    mutationFn: () => remindOhImm(selected, "email"),
    onSuccess: (result) => {
      const skipped = result.filter((r) => r.status === "skipped_unconfigured").length;
      toast({
        variant: "success",
        title: "Reminders queued",
        description:
          skipped > 0
            ? `${result.length} queued · ${skipped} skipped (mail not configured).`
            : `${result.length} reminder(s) processed.`,
      });
      setSelected([]);
      void queryClient.invalidateQueries({ queryKey: ["oh-imm-due"] });
    },
    onError: (error) =>
      toast({
        variant: "error",
        title: "Could not remind",
        description: error instanceof Error ? error.message : "Try again.",
      }),
  });

  if (loading && filteredQuery.isLoading) return <QuietLoading />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-[12px]">Employer</Label>
          <Input
            className="h-8 w-40"
            value={employer}
            onChange={(e) => setEmployer(e.target.value)}
            placeholder="Filter"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">Department</Label>
          <Input
            className="h-8 w-40"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Filter"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">Status</Label>
          <select
            className="h-8 rounded-md border border-dash-border bg-white px-2 text-[13px]"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Any</option>
            <option value="due">Due</option>
            <option value="overdue">Overdue</option>
            <option value="non_responder">Non-responder</option>
          </select>
        </div>
        <PrimaryButton
          type="button"
          disabled={selected.length === 0 || remind.isPending}
          onClick={() => remind.mutate()}
        >
          Remind selected ({selected.length})
        </PrimaryButton>
      </div>

      {(fitDueInDue?.data ?? []).length > 0 ? (
        <div className="mt-4 space-y-1" data-testid="oh-imm-fit-due-panel">
          <h3 className="text-sm font-semibold text-primary">Fit-tests due</h3>
          <ul className="text-sm">
            {(fitDueInDue.data ?? []).map((f) => (
              <li key={String(f.uuid)} className="border-b border-border/60 py-1">
                {String(f.customer_uuid).slice(0, 8)} · expires {String(f.expires_on)} · {String(f.status)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {(expFollowups.data ?? []).length > 0 ? (
        <div className="mt-4 space-y-1">
          <h3 className="text-sm font-semibold text-primary">Exposure follow-ups</h3>
          <ul className="text-sm">
            {(expFollowups.data ?? []).map((f) => (
              <li key={String(f.uuid)} className="border-b border-border/60 py-1">
                {String(f.customer_initials)} · {String(f.label)} · due {String(f.due_date)} · {String(f.status)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {list.length === 0 ? (
        <EmptyAction
          title="Nobody matches"
          description="Adjust filters or wait until doses fall due."
        />
      ) : (
        <ul className="divide-y divide-dash-border rounded-md border border-dash-border bg-white">
          {list.map((row) => {
            const id = row.uuid;
            const checked = selected.includes(id);
            return (
              <li
                key={`${row.customer_uuid}-${row.vaccine_code}-${id}`}
                className="flex items-center gap-3 px-4 py-3"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setSelected((prev) =>
                      checked ? prev.filter((x) => x !== id) : [...prev, id],
                    )
                  }
                  aria-label={`Select ${row.vaccine_code}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-brand-navy">
                    {row.vaccine_name ?? row.vaccine_code}
                  </p>
                  <p className="text-[13px] text-dash-muted">
                    {STATUS_LABEL[row.status] ?? row.status}
                    {row.next_due_date ? ` · due ${row.next_due_date}` : ""}
                    {row.doses_required != null
                      ? ` · ${row.doses_received}/${row.doses_required} doses`
                      : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[12px] font-medium",
                    row.status === "overdue"
                      ? "bg-red-50 text-red-700"
                      : row.status === "due"
                        ? "bg-amber-50 text-amber-800"
                        : "bg-dash-tint text-dash-muted",
                  )}
                >
                  {STATUS_LABEL[row.status] ?? row.status}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CompliancePanel({
  data,
  loading,
}: {
  data:
    | {
        summary: {
          people: number;
          compliant: number;
          percent_compliant: number;
          overdue_rows: number;
        };
        groups: Array<{
          group: string;
          people: number;
          compliant: number;
          overdue: number;
          percent_compliant: number;
        }>;
        overdue: Array<Record<string, unknown>>;
      }
    | undefined;
  loading: boolean;
}) {
  const { toast } = useToast();
  if (loading) return <QuietLoading />;
  if (!data) {
    return (
      <EmptyAction
        title="No compliance data"
        description="Publish schedules with a fitness gate and refresh statuses."
      />
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-dash-muted">
          {data.summary.percent_compliant}% compliant · {data.summary.compliant}/
          {data.summary.people} people · {data.summary.overdue_rows} overdue rows
        </p>
        <SecondaryButton
          type="button"
          onClick={async () => {
            try {
              const { blob, filename } = await downloadOhImmComplianceCsv();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = filename;
              a.click();
              URL.revokeObjectURL(url);
            } catch (error) {
              toast({
                variant: "error",
                title: "Export failed",
                description:
                  error instanceof Error ? error.message : "Try again.",
              });
            }
          }}
        >
          Export CSV
        </SecondaryButton>
      </div>
      <ul className="divide-y divide-dash-border rounded-md border border-dash-border bg-white">
        {data.groups.map((g) => (
          <li
            key={g.group}
            className="flex items-center justify-between gap-3 px-4 py-2.5"
          >
            <div>
              <p className="text-[13px] font-medium text-brand-navy">{g.group}</p>
              <p className="text-[12px] text-dash-muted">
                {g.compliant}/{g.people} compliant · {g.overdue} overdue
              </p>
            </div>
            <span className="text-[13px] font-medium text-brand-navy">
              {g.percent_compliant}%
            </span>
          </li>
        ))}
      </ul>
      {data.overdue.length > 0 ? (
        <div>
          <p className="mb-2 text-[13px] font-medium text-brand-navy">
            Overdue drill-down
          </p>
          <ul className="divide-y divide-dash-border rounded-md border border-dash-border bg-white">
            {data.overdue.slice(0, 50).map((row, i) => (
              <li key={i} className="px-4 py-2 text-[13px] text-dash-muted">
                <span className="font-medium text-brand-navy">
                  {String(row.name || row.customer_uuid)}
                </span>
                {" · "}
                {String(row.vaccine_code)} · {String(row.status)}
                {row.employer ? ` · ${String(row.employer)}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function CatalogPanel({
  vaccines,
  lots,
  loading,
}: {
  vaccines: OhVaccine[];
  lots: OhVaccineLot[];
  loading: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showVaccine, setShowVaccine] = useState(false);
  const [showLot, setShowLot] = useState(false);

  const createVaccine = useMutation({
    mutationFn: createOhImmVaccine,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["oh-imm-vaccines"] });
      setShowVaccine(false);
      toast({ variant: "success", title: "Vaccine added" });
    },
    onError: (error) =>
      toast({
        variant: "error",
        title: "Could not add vaccine",
        description: error instanceof Error ? error.message : "Try again.",
      }),
  });
  const createLot = useMutation({
    mutationFn: createOhImmLot,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["oh-imm-lots"] });
      setShowLot(false);
      toast({ variant: "success", title: "Lot added" });
    },
    onError: (error) =>
      toast({
        variant: "error",
        title: "Could not add lot",
        description: error instanceof Error ? error.message : "Try again.",
      }),
  });

  if (loading) return <QuietLoading />;

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-dash-muted">Vaccines</h2>
          <SecondaryButton type="button" onClick={() => setShowVaccine(true)}>
            <Plus className="size-3.5" aria-hidden />
            Add vaccine
          </SecondaryButton>
        </div>
        {vaccines.length === 0 ? (
          <EmptyAction
            title="No vaccines yet"
            description="Add a vaccine or load the example packs to get started."
          />
        ) : (
          <ul className="divide-y divide-dash-border rounded-md border border-dash-border bg-white">
            {vaccines.map((vaccine) => (
              <li key={vaccine.uuid} className="px-4 py-3">
                <p className="text-[13px] font-medium text-brand-navy">
                  {vaccine.name}{" "}
                  <span className="font-normal text-dash-muted">({vaccine.code})</span>
                </p>
                <p className="text-[13px] text-dash-muted">
                  {[vaccine.brand, vaccine.manufacturer, vaccine.route, vaccine.site]
                    .filter(Boolean)
                    .join(" · ") || "No brand details"}
                  {vaccine.cvx_code ? ` · CVX ${vaccine.cvx_code}` : ""}
                  {vaccine.billing_product_uuid ? " · Linked to billing" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-dash-muted">Lots</h2>
          <SecondaryButton
            type="button"
           
            disabled={vaccines.length === 0}
            onClick={() => setShowLot(true)}
          >
            <Plus className="size-3.5" aria-hidden />
            Add lot
          </SecondaryButton>
        </div>
        {lots.length === 0 ? (
          <p className="text-[13px] text-dash-muted">No lots recorded.</p>
        ) : (
          <ul className="divide-y divide-dash-border rounded-md border border-dash-border bg-white">
            {lots.map((lot) => (
              <li key={lot.uuid} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium text-brand-navy">
                    {lot.lot_number}
                    <span className="font-normal text-dash-muted">
                      {" "}
                      · {lot.vaccine_code}
                    </span>
                  </p>
                  <p className="text-[13px] text-dash-muted">
                    Expires {lot.expiry_date ?? "—"} · qty {lot.quantity_on_hand}
                  </p>
                </div>
                {lot.warning ? (
                  <span className="text-[12px] font-medium text-amber-800">
                    {lot.warning === "recalled"
                      ? "Recalled"
                      : lot.warning === "expired"
                        ? "Expired"
                        : "Low stock"}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {showVaccine ? (
        <VaccineForm
          pending={createVaccine.isPending}
          onClose={() => setShowVaccine(false)}
          onSubmit={(payload) => createVaccine.mutate(payload)}
        />
      ) : null}
      {showLot ? (
        <LotForm
          vaccines={vaccines}
          pending={createLot.isPending}
          onClose={() => setShowLot(false)}
          onSubmit={(payload) => createLot.mutate(payload)}
        />
      ) : null}
    </div>
  );
}

function SchedulesPanel({
  schedules,
  loading,
}: {
  schedules: OhImmSchedule[];
  loading: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<OhImmSchedule | null>(null);

  const create = useMutation({
    mutationFn: createOhImmSchedule,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["oh-imm-schedules"] });
      setShowCreate(false);
      toast({ variant: "success", title: "Schedule draft created" });
    },
  });
  const publish = useMutation({
    mutationFn: ({
      uuid,
      snapshot,
    }: {
      uuid: string;
      snapshot?: Record<string, unknown>;
    }) => publishOhImmSchedule(uuid, snapshot),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["oh-imm-schedules"] });
      setEditing(null);
      toast({ variant: "success", title: "Schedule published" });
    },
    onError: (error) =>
      toast({
        variant: "error",
        title: "Could not publish",
        description: error instanceof Error ? error.message : "Try again.",
      }),
  });

  if (loading) return <QuietLoading />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-dash-muted">
          Flat schedule rules — doses, intervals, boosters, and who they apply to.
        </p>
        <SecondaryButton type="button" onClick={() => setShowCreate(true)}>
          <Plus className="size-3.5" aria-hidden />
          New schedule
        </SecondaryButton>
      </div>
      {schedules.length === 0 ? (
        <EmptyAction
          title="No schedules yet"
          description="Load example packs or create a schedule for your facility."
        />
      ) : (
        <ul className="divide-y divide-dash-border rounded-md border border-dash-border bg-white">
          {schedules.map((schedule) => (
            <li key={schedule.uuid} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-medium text-brand-navy">
                    {schedule.name}
                    {schedule.is_example ? (
                      <span className="ml-2 text-[12px] font-normal text-dash-muted">
                        Example
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[13px] text-dash-muted">
                    {schedule.category} · v
                    {schedule.published_version?.number ?? "draft"}
                    {schedule.published_version?.snapshot?.disclaimer
                      ? " · editable example"
                      : ""}
                  </p>
                  <p className="mt-1 text-[13px] text-dash-muted">
                    {(schedule.published_version?.snapshot?.series ?? [])
                      .map((s) => String(s.vaccine_code ?? ""))
                      .filter(Boolean)
                      .join(", ") || "No series yet"}
                  </p>
                </div>
                <SecondaryButton
                  type="button"
                 
                  onClick={() => setEditing(schedule)}
                >
                  Edit rules
                </SecondaryButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      {showCreate ? (
        <ScheduleCreateForm
          pending={create.isPending}
          onClose={() => setShowCreate(false)}
          onSubmit={(payload) => create.mutate(payload)}
        />
      ) : null}
      {editing ? (
        <ScheduleBuilderSheet
          schedule={editing}
          pending={publish.isPending}
          onClose={() => setEditing(null)}
          onPublish={(snapshot) =>
            publish.mutate({ uuid: editing.uuid, snapshot })
          }
        />
      ) : null}
    </div>
  );
}

function VaccineForm({
  pending,
  onClose,
  onSubmit,
}: {
  pending: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [cvx, setCvx] = useState("");
  return (
    <Drawer title="Add vaccine" onClose={onClose}>
      <Field label="Code" value={code} onChange={setCode} required />
      <Field label="Name" value={name} onChange={setName} required />
      <Field label="CVX (optional)" value={cvx} onChange={setCvx} />
      <div className="flex justify-end gap-2 pt-2">
        <SecondaryButton type="button" onClick={onClose}>
          Cancel
        </SecondaryButton>
        <PrimaryButton
          type="button"
          disabled={pending || !code.trim() || !name.trim()}
          onClick={() =>
            onSubmit({
              code: code.trim(),
              name: name.trim(),
              cvx_code: cvx.trim() || undefined,
            })
          }
        >
          Save
        </PrimaryButton>
      </div>
    </Drawer>
  );
}

function LotForm({
  vaccines,
  pending,
  onClose,
  onSubmit,
}: {
  vaccines: OhVaccine[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [vaccineUuid, setVaccineUuid] = useState(vaccines[0]?.uuid ?? "");
  const [lotNumber, setLotNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [qty, setQty] = useState("10");
  return (
    <Drawer title="Add lot" onClose={onClose}>
      <div className="space-y-1.5">
        <Label>Vaccine</Label>
        <select
          className="h-9 w-full rounded-md border border-dash-border bg-white px-3 text-[13px]"
          value={vaccineUuid}
          onChange={(e) => setVaccineUuid(e.target.value)}
        >
          {vaccines.map((v) => (
            <option key={v.uuid} value={v.uuid}>
              {v.name} ({v.code})
            </option>
          ))}
        </select>
      </div>
      <Field label="Lot number" value={lotNumber} onChange={setLotNumber} required />
      <Field label="Expiry" value={expiry} onChange={setExpiry} type="date" />
      <Field label="Quantity" value={qty} onChange={setQty} />
      <div className="flex justify-end gap-2 pt-2">
        <SecondaryButton type="button" onClick={onClose}>
          Cancel
        </SecondaryButton>
        <PrimaryButton
          type="button"
          disabled={pending || !vaccineUuid || !lotNumber.trim()}
          onClick={() =>
            onSubmit({
              vaccine_uuid: vaccineUuid,
              lot_number: lotNumber.trim(),
              expiry_date: expiry || null,
              quantity_on_hand: Number(qty) || 0,
            })
          }
        >
          Save
        </PrimaryButton>
      </div>
    </Drawer>
  );
}


function ScheduleCreateForm({
  pending,
  onClose,
  onSubmit,
}: {
  pending: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("occupational");
  return (
    <Drawer title="New schedule" onClose={onClose}>
      <Field label="Code" value={code} onChange={setCode} required />
      <Field label="Name" value={name} onChange={setName} required />
      <div className="space-y-1.5">
        <Label>Category</Label>
        <select
          className="h-9 w-full rounded-md border border-dash-border bg-white px-3 text-[13px]"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="occupational">Occupational</option>
          <option value="epi">Childhood EPI</option>
          <option value="adult">Adult</option>
          <option value="travel">Travel</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <SecondaryButton type="button" onClick={onClose}>
          Cancel
        </SecondaryButton>
        <PrimaryButton
          type="button"
          disabled={pending || !code.trim() || !name.trim()}
          onClick={() =>
            onSubmit({
              code: code.trim(),
              name: name.trim(),
              category,
              snapshot: {
                disclaimer: "Facility schedule — review before use.",
                series: [],
                assignment: { fitness_gate: "off" },
              },
            })
          }
        >
          Create draft
        </PrimaryButton>
      </div>
    </Drawer>
  );
}

function ScheduleBuilderSheet({
  schedule,
  pending,
  onClose,
  onPublish,
}: {
  schedule: OhImmSchedule;
  pending: boolean;
  onClose: () => void;
  onPublish: (snapshot: Record<string, unknown>) => void;
}) {
  const { toast } = useToast();
  const initial = schedule.published_version?.snapshot?.series ?? [];
  const initialAssign = schedule.published_version?.snapshot?.assignment ?? {};
  const [rows, setRows] = useState(
    initial.map((s) => ({
      vaccine_code: String(s.vaccine_code ?? ""),
      doses: Number(s.doses ?? 1),
      min_interval_days: Number(s.min_interval_days ?? 28),
      booster_years: s.booster_years != null ? Number(s.booster_years) : "",
      titre_enabled: Boolean((s.titre_gate as { enabled?: boolean } | undefined)?.enabled),
      titre_threshold: Number((s.titre_gate as { threshold?: number } | undefined)?.threshold ?? 10),
    })),
  );
  const [ageMin, setAgeMin] = useState(
    initialAssign.age_min_years != null ? String(initialAssign.age_min_years) : "",
  );
  const [ageMax, setAgeMax] = useState(
    initialAssign.age_max_years != null ? String(initialAssign.age_max_years) : "",
  );
  const [sex, setSex] = useState(String(initialAssign.sex ?? "any"));
  const [pregnancy, setPregnancy] = useState(
    initialAssign.pregnancy == null ? "any" : initialAssign.pregnancy ? "yes" : "no",
  );
  const [jobRoles, setJobRoles] = useState(
    Array.isArray(initialAssign.job_roles) ? initialAssign.job_roles.join(", ") : "",
  );
  const [departments, setDepartments] = useState(
    Array.isArray(initialAssign.departments) ? initialAssign.departments.join(", ") : "",
  );
  const [sites, setSites] = useState(
    Array.isArray(initialAssign.sites) ? initialAssign.sites.join(", ") : "",
  );
  const [employers, setEmployers] = useState(
    Array.isArray(initialAssign.employers) ? initialAssign.employers.join(", ") : "",
  );
  const [fitnessGate, setFitnessGate] = useState(
    String(initialAssign.fitness_gate ?? "off"),
  );
  const [preview, setPreview] = useState<{ matched: number; scanned: number } | null>(null);

  const assignment = useMemo(() => {
    const list = (raw: string) =>
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    return {
      age_min_years: ageMin !== "" ? Number(ageMin) : null,
      age_max_years: ageMax !== "" ? Number(ageMax) : null,
      sex: sex === "any" ? null : sex,
      pregnancy: pregnancy === "any" ? null : pregnancy === "yes",
      job_roles: list(jobRoles),
      departments: list(departments),
      sites: list(sites),
      employers: list(employers),
      fitness_gate: fitnessGate,
    };
  }, [ageMin, ageMax, sex, pregnancy, jobRoles, departments, sites, employers, fitnessGate]);

  const runPreview = useMutation({
    mutationFn: () =>
      previewOhImmAssignment(
        assignment,
        pregnancy === "any" ? undefined : pregnancy === "yes",
      ),
    onSuccess: (data) => setPreview({ matched: data.matched, scanned: data.scanned }),
    onError: (error) =>
      toast({
        variant: "error",
        title: "Preview failed",
        description: error instanceof Error ? error.message : "Try again.",
      }),
  });

  return (
    <Drawer title={`Edit · ${schedule.name}`} onClose={onClose} wide>
      <p className="text-[13px] text-dash-muted">
        Assignment rules decide who this schedule applies to. Publishing pins the version.
      </p>

      <div className="space-y-2 rounded-md border border-dash-border p-3">
        <p className="text-[13px] font-medium text-brand-navy">Who it covers</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Age from" value={ageMin} onChange={setAgeMin} />
          <Field label="Age to" value={ageMax} onChange={setAgeMax} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Sex</Label>
            <select
              className="h-9 w-full rounded-md border border-dash-border bg-white px-3 text-[13px]"
              value={sex}
              onChange={(e) => setSex(e.target.value)}
            >
              <option value="any">Any</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Pregnancy</Label>
            <select
              className="h-9 w-full rounded-md border border-dash-border bg-white px-3 text-[13px]"
              value={pregnancy}
              onChange={(e) => setPregnancy(e.target.value)}
            >
              <option value="any">Any</option>
              <option value="yes">Pregnant</option>
              <option value="no">Not pregnant</option>
            </select>
          </div>
        </div>
        <Field label="Job roles (comma-separated)" value={jobRoles} onChange={setJobRoles} />
        <Field label="Departments" value={departments} onChange={setDepartments} />
        <Field label="Sites" value={sites} onChange={setSites} />
        <Field label="Employers" value={employers} onChange={setEmployers} />
        <div className="space-y-1.5">
          <Label>Fitness certificate gate</Label>
          <select
            className="h-9 w-full rounded-md border border-dash-border bg-white px-3 text-[13px]"
            value={fitnessGate}
            onChange={(e) => setFitnessGate(e.target.value)}
          >
            <option value="off">Off</option>
            <option value="warn">Warn on certificate</option>
            <option value="block">Block certificate until compliant</option>
          </select>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <SecondaryButton
            type="button"
            disabled={runPreview.isPending}
            onClick={() => runPreview.mutate()}
          >
            {runPreview.isPending ? "Counting…" : "Preview matches"}
          </SecondaryButton>
          {preview ? (
            <p className="text-[13px] text-dash-muted">
              {preview.matched} of {preview.scanned} active employees match
            </p>
          ) : null}
        </div>
      </div>

      <p className="pt-2 text-[13px] font-medium text-brand-navy">Vaccine series</p>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div
            key={index}
            className="space-y-2 rounded-md border border-dash-border p-2"
          >
            <div className="grid grid-cols-4 gap-2">
              <Input
                placeholder="Vaccine code"
                value={row.vaccine_code}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = { ...row, vaccine_code: e.target.value };
                  setRows(next);
                }}
              />
              <Input
                type="number"
                min={1}
                placeholder="Doses"
                value={row.doses}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = { ...row, doses: Number(e.target.value) || 1 };
                  setRows(next);
                }}
              />
              <Input
                type="number"
                min={0}
                placeholder="Min days"
                value={row.min_interval_days}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = {
                    ...row,
                    min_interval_days: Number(e.target.value) || 0,
                  };
                  setRows(next);
                }}
              />
              <Input
                type="number"
                min={0}
                placeholder="Booster years"
                value={row.booster_years}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = { ...row, booster_years: e.target.value };
                  setRows(next);
                }}
              />
            </div>
            <label className="flex items-center gap-2 text-[12px] text-dash-muted">
              <input
                type="checkbox"
                checked={row.titre_enabled}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = { ...row, titre_enabled: e.target.checked };
                  setRows(next);
                }}
              />
              Titre gate after series
              {row.titre_enabled ? (
                <Input
                  className="h-7 w-24"
                  type="number"
                  value={row.titre_threshold}
                  onChange={(e) => {
                    const next = [...rows];
                    next[index] = {
                      ...row,
                      titre_threshold: Number(e.target.value) || 0,
                    };
                    setRows(next);
                  }}
                />
              ) : null}
            </label>
          </div>
        ))}
      </div>
      <SecondaryButton
        type="button"
        onClick={() =>
          setRows([
            ...rows,
            {
              vaccine_code: "",
              doses: 1,
              min_interval_days: 28,
              booster_years: "",
              titre_enabled: false,
              titre_threshold: 10,
            },
          ])
        }
      >
        Add vaccine row
      </SecondaryButton>
      <div className="flex justify-end gap-2 pt-2">
        <SecondaryButton type="button" onClick={onClose}>
          Cancel
        </SecondaryButton>
        <PrimaryButton
          type="button"
          disabled={pending}
          onClick={() =>
            onPublish({
              schema_version: 1,
              disclaimer:
                schedule.published_version?.snapshot?.disclaimer ??
                "Facility schedule — review before use.",
              assignment,
              series: rows
                .filter((r) => r.vaccine_code.trim())
                .map((r) => ({
                  vaccine_code: r.vaccine_code.trim().toUpperCase(),
                  doses: r.doses,
                  min_interval_days: r.min_interval_days,
                  ...(r.booster_years !== ""
                    ? { booster_years: Number(r.booster_years) }
                    : {}),
                  ...(r.titre_enabled
                    ? {
                        titre_gate: {
                          enabled: true,
                          analyte: "anti-HBs",
                          threshold: r.titre_threshold,
                          unit: "mIU/mL",
                          non_responder: false,
                        },
                      }
                    : {}),
                })),
            })
          }
        >
          Publish version
        </PrimaryButton>
      </div>
    </Drawer>
  );
}





function CertificatePdfForm() {
  const { toast } = useToast();
  const [customerUuid, setCustomerUuid] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label className="text-[12px]">Employee customer UUID</Label>
        <Input
          className="h-8 w-72"
          value={customerUuid}
          onChange={(e) => setCustomerUuid(e.target.value)}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        />
      </div>
      <PrimaryButton
        type="button"
        data-testid="oh-imm-hub-download-pdf"
        disabled={pending || !customerUuid.trim()}
        onClick={async () => {
          setPending(true);
          try {
            const cert = await issueOhImmCertificate(customerUuid.trim());
            const { blob, filename } = await downloadOhImmCertificatePdf(cert.uuid);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            toast({ variant: "success", title: "PDF downloaded" });
          } catch (error) {
            toast({
              variant: "error",
              title: "Could not download PDF",
              description: error instanceof Error ? error.message : "Try again.",
            });
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Preparing…" : "Download PDF"}
      </PrimaryButton>
    </div>
  );
}

function ToolsPanel({ schedules }: { schedules: OhImmSchedule[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const audits = useQuery({
    queryKey: ["oh-imm-audits"],
    queryFn: () => fetchOhImmAudits({ limit: 50 }),
  });
  const mappings = useQuery({
    queryKey: ["oh-imm-dhis-mappings"],
    queryFn: fetchOhImmDhisMappings,
  });
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [orgUnit, setOrgUnit] = useState("OU");
  const [packJson, setPackJson] = useState("");
  const [deCode, setDeCode] = useState("");
  const [deVaccine, setDeVaccine] = useState("");
  const [deId, setDeId] = useState("");

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-[13px] font-medium text-brand-navy">Exports</p>
        <p className="text-[13px] text-dash-muted">
          Read-only FHIR immunizations and DHIS2 aggregates for this facility.
        </p>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton
            type="button"
            onClick={async () => {
              try {
                const { blob, filename } = await downloadOhImmFhirNdjson();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
              } catch (error) {
                toast({
                  variant: "error",
                  title: "FHIR export failed",
                  description: error instanceof Error ? error.message : "Try again.",
                });
              }
            }}
          >
            Download FHIR NDJSON
          </SecondaryButton>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-[12px]">Period (YYYYMM)</Label>
              <Input className="h-8 w-28" value={period} onChange={(e) => setPeriod(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Org unit</Label>
              <Input className="h-8 w-28" value={orgUnit} onChange={(e) => setOrgUnit(e.target.value)} />
            </div>
            <SecondaryButton
              type="button"
              onClick={async () => {
                try {
                  const { blob, filename } = await downloadOhImmDhisCsv(period, orgUnit);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = filename;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (error) {
                  toast({
                    variant: "error",
                    title: "DHIS2 export failed",
                    description: error instanceof Error ? error.message : "Try again.",
                  });
                }
              }}
            >
              Download DHIS2 CSV
            </SecondaryButton>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[13px] font-medium text-brand-navy">Vaccination certificate PDF</p>
        <p className="text-[13px] text-dash-muted">
          Issue and download an A4 PDF for an employee (also available on their immunizations tab).
        </p>
        <CertificatePdfForm />
      </section>

      <section className="space-y-2">
        <p className="text-[13px] font-medium text-brand-navy">DHIS2 data element mapping</p>
        <div className="flex flex-wrap gap-2">
          <Input className="h-8 w-28" placeholder="Vaccine" value={deVaccine} onChange={(e) => setDeVaccine(e.target.value)} />
          <Input className="h-8 w-36" placeholder="Data element id" value={deId} onChange={(e) => setDeId(e.target.value)} />
          <Input className="h-8 w-40" placeholder="Label" value={deCode} onChange={(e) => setDeCode(e.target.value)} />
          <PrimaryButton
            type="button"
            disabled={!deVaccine.trim() || !deId.trim()}
            onClick={async () => {
              try {
                await createOhImmDhisMapping({
                  vaccine_code: deVaccine.trim(),
                  data_element_id: deId.trim(),
                  label: deCode.trim(),
                  age_band: "18+",
                  sex: "",
                });
                setDeVaccine("");
                setDeId("");
                setDeCode("");
                void queryClient.invalidateQueries({ queryKey: ["oh-imm-dhis-mappings"] });
                toast({ variant: "success", title: "Mapping saved" });
              } catch (error) {
                toast({
                  variant: "error",
                  title: "Could not save mapping",
                  description: error instanceof Error ? error.message : "Try again.",
                });
              }
            }}
          >
            Add mapping
          </PrimaryButton>
        </div>
        {mappings.isLoading ? (
          <QuietLoading />
        ) : (mappings.data ?? []).length === 0 ? (
          <EmptyAction title="No mappings yet" description="Add vaccine → data element pairs for DHIS2 exports." />
        ) : (
          <ul className="divide-y divide-dash-border rounded-md border border-dash-border bg-white">
            {(mappings.data ?? []).map((m) => (
              <li key={String(m.uuid)} className="flex justify-between gap-2 px-4 py-2 text-[13px]">
                <span className="font-medium text-brand-navy">{String(m.vaccine_code)}</span>
                <span className="text-dash-muted">{String(m.data_element_id)} · {String(m.label || m.age_band || "")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <p className="text-[13px] font-medium text-brand-navy">Schedule packs</p>
        <p className="text-[13px] text-dash-muted">
          Import never overwrites an edited schedule — it publishes a new version. Example packs stay labelled as examples.
        </p>
        <div className="flex flex-wrap gap-2">
          {(schedules ?? []).slice(0, 6).map((s) => (
            <SecondaryButton
              key={s.uuid}
              type="button"
              onClick={async () => {
                try {
                  const pack = await exportOhImmPack(s.uuid);
                  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${s.code || "schedule"}-pack.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (error) {
                  toast({
                    variant: "error",
                    title: "Pack export failed",
                    description: error instanceof Error ? error.message : "Try again.",
                  });
                }
              }}
            >
              Export {s.name}
            </SecondaryButton>
          ))}
        </div>
        <textarea
          className="min-h-28 w-full rounded-md border border-dash-border p-2 text-[13px]"
          placeholder="Paste pack JSON to import…"
          value={packJson}
          onChange={(e) => setPackJson(e.target.value)}
        />
        <PrimaryButton
          type="button"
          disabled={!packJson.trim()}
          onClick={async () => {
            try {
              const pack = JSON.parse(packJson) as Record<string, unknown>;
              const result = await importOhImmPack(pack);
              void queryClient.invalidateQueries({ queryKey: ["oh-imm-schedules"] });
              void queryClient.invalidateQueries({ queryKey: ["oh-imm-audits"] });
              setPackJson("");
              toast({
                variant: "success",
                title: "Pack installed",
                description: String(result.notes || result.status || "Done"),
              });
            } catch (error) {
              toast({
                variant: "error",
                title: "Pack import failed",
                description: error instanceof Error ? error.message : "Check JSON and try again.",
              });
            }
          }}
        >
          Import pack
        </PrimaryButton>
      </section>

      <section className="space-y-2">
        <p className="text-[13px] font-medium text-brand-navy">Audit trail</p>
        <p className="text-[13px] text-dash-muted">Who changed what — codes and status only, no patient names.</p>
        {audits.isLoading ? (
          <QuietLoading />
        ) : (audits.data ?? []).length === 0 ? (
          <EmptyAction title="No audit rows yet" description="Catalog, dose, certificate, and export actions appear here." />
        ) : (
          <ul className="divide-y divide-dash-border rounded-md border border-dash-border bg-white">
            {(audits.data ?? []).map((row) => (
              <li key={String(row.uuid)} className="px-4 py-2.5 text-[13px]">
                <p className="font-medium text-brand-navy">
                  {String(row.entity_type)} · {String(row.action)}
                </p>
                <p className="text-dash-muted">
                  {String(row.summary || "")}
                  {row.occurred_at ? ` · ${String(row.occurred_at)}` : ""}
                  {row.actor_name ? ` · ${String(row.actor_name)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Drawer({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
      <button type="button" className="flex-1" aria-label="Close" onClick={onClose} />
      <div
        className={cn(
          "flex h-full w-full flex-col gap-3 overflow-y-auto border-l border-dash-border bg-white p-5 shadow-xl",
          wide ? "max-w-xl" : "max-w-md",
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-brand-navy">{title}</h2>
          <SecondaryButton type="button" onClick={onClose}>
            Close
          </SecondaryButton>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function QuietLoading() {
  return (
    <p className="flex items-center gap-2 text-[13px] text-dash-muted">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      Loading…
    </p>
  );
}

function EmptyAction({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-dash-border px-4 py-8 text-center">
      <p className="text-[13px] font-medium text-brand-navy">{title}</p>
      <p className="mt-1 text-[13px] text-dash-muted">{description}</p>
    </div>
  );
}


function RiskPanel() {
  const pathwaysQ = useQuery({ queryKey: ["oh-imm-pathways"], queryFn: fetchOhImmPathways });
  const tasksQ = useQuery({ queryKey: ["oh-imm-tasks"], queryFn: fetchOhImmTasks });
  const protocolsQ = useQuery({ queryKey: ["oh-imm-nr-protocols"], queryFn: fetchOhImmNrProtocols });
  const qc = useQueryClient();
  const [pathwayForm, setPathwayForm] = useState({ code: "", name: "", description: "", vaccine_code: "" });
  const [taskForm, setTaskForm] = useState({
    pathway_uuid: "",
    code: "",
    name: "",
    likelihood: 3,
    severity: 3,
  });
  const [assignForm, setAssignForm] = useState({
    task_uuid: "",
    department_name: "",
    site: "",
    customer_uuid: "",
  });
  const [protocolForm, setProtocolForm] = useState({
    vaccine_code: "HEPB",
    titre_threshold: 10,
    max_series: 2,
    titre_interval_days: 28,
  });
  const [msg, setMsg] = useState("");

  const seedRisk = useMutation({
    mutationFn: seedOhImmRiskExamples,
    onSuccess: (r) => {
      setMsg(`Loaded ${r.pathways} pathways and ${r.tasks} example tasks.`);
      void qc.invalidateQueries({ queryKey: ["oh-imm-pathways"] });
      void qc.invalidateQueries({ queryKey: ["oh-imm-tasks"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });
  const seedNr = useMutation({
    mutationFn: seedOhImmNrHepb,
    onSuccess: () => {
      setMsg("HepB non-responder protocol ready.");
      void qc.invalidateQueries({ queryKey: ["oh-imm-nr-protocols"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });
  const createPathway = useMutation({
    mutationFn: () =>
      createOhImmPathway({
        code: pathwayForm.code,
        name: pathwayForm.name,
        description: pathwayForm.description,
        requirements: pathwayForm.vaccine_code
          ? [
              {
                vaccine_code: pathwayForm.vaccine_code,
                schedule_code: "",
                titre_required: pathwayForm.vaccine_code.toUpperCase() === "HEPB",
                control_codes: [],
              },
            ]
          : [],
      }),
    onSuccess: () => {
      setPathwayForm({ code: "", name: "", description: "", vaccine_code: "" });
      void qc.invalidateQueries({ queryKey: ["oh-imm-pathways"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });
  const createTask = useMutation({
    mutationFn: () => createOhImmTask(taskForm),
    onSuccess: () => {
      setTaskForm({ pathway_uuid: "", code: "", name: "", likelihood: 3, severity: 3 });
      void qc.invalidateQueries({ queryKey: ["oh-imm-tasks"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });
  const assignTask = useMutation({
    mutationFn: () =>
      assignOhImmTask({
        task_uuid: assignForm.task_uuid,
        department_name: assignForm.department_name || undefined,
        site: assignForm.site || undefined,
        customer_uuid: assignForm.customer_uuid || undefined,
      }),
    onSuccess: () => setMsg("Task assigned."),
    onError: (e: Error) => setMsg(e.message),
  });
  const createProtocol = useMutation({
    mutationFn: () =>
      createOhImmNrProtocol({
        ...protocolForm,
        flag_on_true_non_responder: true,
        recommend_role_change: true,
        recommend_ppe_plan: true,
        enable_hbig_fast_track: true,
        require_quantitative_titre: true,
      }),
    onSuccess: () => {
      setMsg("Non-responder protocol saved.");
      void qc.invalidateQueries({ queryKey: ["oh-imm-nr-protocols"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const pathways = pathwaysQ.data ?? [];
  const tasks = tasksQ.data ?? [];
  const protocols = protocolsQ.data ?? [];

  if (pathwaysQ.isLoading || tasksQ.isLoading || protocolsQ.isLoading) return <QuietLoading />;
  if (pathwaysQ.isError || tasksQ.isError || protocolsQ.isError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Could not load risk pathways. Check your connection and try again.
      </p>
    );
  }

  return (
    <div className="space-y-6" data-testid="oh-imm-risk-panel">
      <div className="flex flex-wrap items-center gap-2">
        <SecondaryButton type="button" className="h-8" onClick={() => seedRisk.mutate()} disabled={seedRisk.isPending}>
          Load example pathways
        </SecondaryButton>
        <SecondaryButton type="button" className="h-8" onClick={() => seedNr.mutate()} disabled={seedNr.isPending}>
          Load HepB non-responder protocol
        </SecondaryButton>
        {msg ? <span className="text-sm text-muted-foreground">{msg}</span> : null}
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Exposure pathways</h3>
        <p className="text-sm text-muted-foreground">
          Pathways drive required vaccines, titre checks, and controls. Examples are labelled and editable.
        </p>
        {(pathwaysQ.isLoading || pathways.length === 0) && !pathwaysQ.isLoading ? (
          <p className="text-sm text-muted-foreground">
            No pathways yet.{" "}
            <button type="button" className="text-primary underline" onClick={() => seedRisk.mutate()}>
              Load examples
            </button>
          </p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1 pr-3 font-medium">Code</th>
                <th className="py-1 pr-3 font-medium">Name</th>
                <th className="py-1 pr-3 font-medium">Vaccines</th>
                <th className="py-1 font-medium">Controls</th>
              </tr>
            </thead>
            <tbody>
              {pathways.map((p: OhImmPathway) => (
                <tr key={p.uuid} className="border-b border-border/60">
                  <td className="py-1.5 pr-3 font-mono text-xs">
                    {p.code}
                    {p.is_example ? (
                      <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-800">example</span>
                    ) : null}
                  </td>
                  <td className="py-1.5 pr-3">{p.name}</td>
                  <td className="py-1.5 pr-3">
                    {p.requirements.map((r) => r.vaccine_code).filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="py-1.5">
                    {Array.from(
                      new Set(p.requirements.flatMap((r) => r.control_codes ?? [])),
                    ).join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <input
            className="h-8 w-28 rounded border px-2 text-sm"
            placeholder="Code"
            value={pathwayForm.code}
            onChange={(e) => setPathwayForm((f) => ({ ...f, code: e.target.value }))}
          />
          <input
            className="h-8 w-40 rounded border px-2 text-sm"
            placeholder="Name"
            value={pathwayForm.name}
            onChange={(e) => setPathwayForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            className="h-8 w-28 rounded border px-2 text-sm"
            placeholder="Vaccine code"
            value={pathwayForm.vaccine_code}
            onChange={(e) => setPathwayForm((f) => ({ ...f, vaccine_code: e.target.value }))}
          />
          <PrimaryButton type="button" className="h-8" onClick={() => createPathway.mutate()} disabled={createPathway.isPending}>
            Add pathway
          </PrimaryButton>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Tasks & scoring</h3>
        <p className="text-sm text-muted-foreground">
          Likelihood × severity (1–5). Assign tasks to departments, sites, roles, or a specific employee.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1 pr-3 font-medium">Task</th>
                <th className="py-1 pr-3 font-medium">Pathway</th>
                <th className="py-1 pr-3 font-medium">L×S</th>
                <th className="py-1 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task: OhImmTask) => (
                <tr key={task.uuid} className="border-b border-border/60">
                  <td className="py-1.5 pr-3">
                    <span className="font-mono text-xs">{task.code}</span> {task.name}
                    {task.is_example ? (
                      <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-800">example</span>
                    ) : null}
                  </td>
                  <td className="py-1.5 pr-3">{task.pathway_code ?? "—"}</td>
                  <td className="py-1.5 pr-3">
                    {task.likelihood}×{task.severity}
                  </td>
                  <td className="py-1.5 font-medium">{task.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <select
            className="h-8 rounded border px-2 text-sm"
            value={taskForm.pathway_uuid}
            onChange={(e) => setTaskForm((f) => ({ ...f, pathway_uuid: e.target.value }))}
          >
            <option value="">Pathway…</option>
            {pathways.map((p: OhImmPathway) => (
              <option key={p.uuid} value={p.uuid}>
                {p.code}
              </option>
            ))}
          </select>
          <input
            className="h-8 w-28 rounded border px-2 text-sm"
            placeholder="Task code"
            value={taskForm.code}
            onChange={(e) => setTaskForm((f) => ({ ...f, code: e.target.value }))}
          />
          <input
            className="h-8 w-40 rounded border px-2 text-sm"
            placeholder="Name"
            value={taskForm.name}
            onChange={(e) => setTaskForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            type="number"
            min={1}
            max={5}
            className="h-8 w-16 rounded border px-2 text-sm"
            value={taskForm.likelihood}
            onChange={(e) => setTaskForm((f) => ({ ...f, likelihood: Number(e.target.value) }))}
          />
          <input
            type="number"
            min={1}
            max={5}
            className="h-8 w-16 rounded border px-2 text-sm"
            value={taskForm.severity}
            onChange={(e) => setTaskForm((f) => ({ ...f, severity: Number(e.target.value) }))}
          />
          <PrimaryButton type="button" className="h-8" onClick={() => createTask.mutate()} disabled={createTask.isPending}>
            Add task
          </PrimaryButton>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <select
            className="h-8 rounded border px-2 text-sm"
            value={assignForm.task_uuid}
            onChange={(e) => setAssignForm((f) => ({ ...f, task_uuid: e.target.value }))}
          >
            <option value="">Assign task…</option>
            {tasks.map((task: OhImmTask) => (
              <option key={task.uuid} value={task.uuid}>
                {task.code}
              </option>
            ))}
          </select>
          <input
            className="h-8 w-36 rounded border px-2 text-sm"
            placeholder="Department"
            value={assignForm.department_name}
            onChange={(e) => setAssignForm((f) => ({ ...f, department_name: e.target.value }))}
          />
          <input
            className="h-8 w-28 rounded border px-2 text-sm"
            placeholder="Site"
            value={assignForm.site}
            onChange={(e) => setAssignForm((f) => ({ ...f, site: e.target.value }))}
          />
          <input
            className="h-8 w-52 rounded border px-2 text-sm"
            placeholder="Employee UUID (override)"
            value={assignForm.customer_uuid}
            onChange={(e) => setAssignForm((f) => ({ ...f, customer_uuid: e.target.value }))}
          />
          <SecondaryButton type="button" className="h-8" onClick={() => assignTask.mutate()} disabled={assignTask.isPending}>
            Assign
          </SecondaryButton>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Non-responder protocols</h3>
        <p className="text-sm text-muted-foreground">
          After series + quantitative titre: 1st fail → second series; 2nd fail → true non-responder with HBIG fast-track.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1 pr-3 font-medium">Vaccine</th>
                <th className="py-1 pr-3 font-medium">Threshold</th>
                <th className="py-1 pr-3 font-medium">Max series</th>
                <th className="py-1 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {protocols.map((p: OhImmNrProtocol) => (
                <tr key={p.uuid} className="border-b border-border/60">
                  <td className="py-1.5 pr-3 font-mono text-xs">{p.vaccine_code}</td>
                  <td className="py-1.5 pr-3">
                    {p.titre_threshold} {p.titre_unit}
                  </td>
                  <td className="py-1.5 pr-3">{p.max_series}</td>
                  <td className="py-1.5 text-xs text-muted-foreground">
                    {[
                      p.flag_on_true_non_responder ? "flag" : null,
                      p.recommend_role_change ? "role change" : null,
                      p.recommend_ppe_plan ? "PPE plan" : null,
                      p.enable_hbig_fast_track ? "HBIG fast-track" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <input
            className="h-8 w-28 rounded border px-2 text-sm"
            placeholder="Vaccine"
            value={protocolForm.vaccine_code}
            onChange={(e) => setProtocolForm((f) => ({ ...f, vaccine_code: e.target.value }))}
          />
          <input
            type="number"
            className="h-8 w-24 rounded border px-2 text-sm"
            placeholder="Threshold"
            value={protocolForm.titre_threshold}
            onChange={(e) => setProtocolForm((f) => ({ ...f, titre_threshold: Number(e.target.value) }))}
          />
          <input
            type="number"
            className="h-8 w-20 rounded border px-2 text-sm"
            placeholder="Max series"
            value={protocolForm.max_series}
            onChange={(e) => setProtocolForm((f) => ({ ...f, max_series: Number(e.target.value) }))}
          />
          <PrimaryButton type="button" className="h-8" onClick={() => createProtocol.mutate()} disabled={createProtocol.isPending}>
            Save protocol
          </PrimaryButton>
        </div>
      </section>
    </div>
  );
}


function formatClock(seconds?: number) {
  if (seconds == null) return "—";
  const overdue = seconds < 0;
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return overdue ? `${label} overdue` : `${label} left`;
}

function ExposuresPanel() {
  const qc = useQueryClient();
  const listQ = useQuery({ queryKey: ["oh-imm-exposures"], queryFn: () => fetchOhImmExposures({ status: "open" }) });
  const followQ = useQuery({ queryKey: ["oh-imm-exp-followups"], queryFn: () => fetchOhImmExposureDueFollowups(30) });
  const oncallQ = useQuery({ queryKey: ["oh-imm-exp-oncall"], queryFn: () => fetchOhImmExposureOncall() });
  const [form, setForm] = useState({
    customer_uuid: "",
    exposed_at: new Date().toISOString().slice(0, 16),
    exposure_type: "needlestick",
    body_site: "",
    device: "",
    source_known: "unknown",
    first_aid_done: false,
    site: "",
    pathway_code: "",
  });
  const [oncall, setOncall] = useState({ name: "", phone: "", email: "", site: "", shift: "any" });
  const [msg, setMsg] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      createOhImmExposure({
        ...form,
        exposed_at: new Date(form.exposed_at).toISOString(),
        first_aid_done: form.first_aid_done,
      }),
    onSuccess: (row) => {
      setMsg(`Logged ${row.exposure_type} · triage ${row.triage_band}`);
      setSelected(row.uuid);
      void qc.invalidateQueries({ queryKey: ["oh-imm-exposures"] });
      void qc.invalidateQueries({ queryKey: ["oh-imm-exp-followups"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });
  const seed = useMutation({
    mutationFn: seedOhImmExposureTypes,
    onSuccess: (r) => setMsg(`Type defaults ready (${r.seeded} new).`),
  });
  const addOncall = useMutation({
    mutationFn: () => createOhImmExposureOncall(oncall),
    onSuccess: () => {
      setOncall({ name: "", phone: "", email: "", site: "", shift: "any" });
      void qc.invalidateQueries({ queryKey: ["oh-imm-exp-oncall"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const rows = listQ.data ?? [];
  const active = rows.find((r) => r.uuid === selected) ?? rows[0] ?? null;

  if (listQ.isLoading) return <QuietLoading />;
  if (listQ.isError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Could not load exposures. Check your connection and try again.
      </p>
    );
  }

  return (
    <div className="space-y-6" data-testid="oh-imm-exposures-panel">
      <div className="flex flex-wrap items-center gap-2">
        <SecondaryButton type="button" className="h-8" onClick={() => seed.mutate()} disabled={seed.isPending}>
          Seed exposure types
        </SecondaryButton>
        {msg ? <span className="text-sm text-muted-foreground">{msg}</span> : null}
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Log exposure</h3>
        <p className="text-sm text-muted-foreground">
          Quick log — clocks start from exposure time. HIV PEP target ≤2h (max 72h); HBIG ≤24h (max 7d).
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            className="h-9 min-w-[12rem] flex-1 rounded border px-2 text-sm"
            placeholder="Employee UUID"
            value={form.customer_uuid}
            onChange={(e) => setForm((f) => ({ ...f, customer_uuid: e.target.value }))}
          />
          <input
            type="datetime-local"
            className="h-9 rounded border px-2 text-sm"
            value={form.exposed_at}
            onChange={(e) => setForm((f) => ({ ...f, exposed_at: e.target.value }))}
          />
          <select
            className="h-9 rounded border px-2 text-sm"
            value={form.exposure_type}
            onChange={(e) => setForm((f) => ({ ...f, exposure_type: e.target.value }))}
          >
            <option value="needlestick">Needlestick</option>
            <option value="sharps">Sharps</option>
            <option value="splash_mucous">Splash (mucous)</option>
            <option value="bite">Bite</option>
            <option value="airborne">Airborne</option>
            <option value="other">Other</option>
          </select>
          <input
            className="h-9 w-28 rounded border px-2 text-sm"
            placeholder="Body site"
            value={form.body_site}
            onChange={(e) => setForm((f) => ({ ...f, body_site: e.target.value }))}
          />
          <input
            className="h-9 w-28 rounded border px-2 text-sm"
            placeholder="Device"
            value={form.device}
            onChange={(e) => setForm((f) => ({ ...f, device: e.target.value }))}
          />
          <select
            className="h-9 rounded border px-2 text-sm"
            value={form.source_known}
            onChange={(e) => setForm((f) => ({ ...f, source_known: e.target.value }))}
          >
            <option value="unknown">Source unknown</option>
            <option value="known">Source known</option>
          </select>
          <label className="flex h-9 items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={form.first_aid_done}
              onChange={(e) => setForm((f) => ({ ...f, first_aid_done: e.target.checked }))}
            />
            First aid done
          </label>
          <input
            className="h-9 w-28 rounded border px-2 text-sm"
            placeholder="Site"
            value={form.site}
            onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}
          />
          <PrimaryButton type="button" className="h-9" onClick={() => create.mutate()} disabled={create.isPending}>
            Log incident
          </PrimaryButton>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Open incidents</h3>
        {listQ.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        {!listQ.isLoading && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open exposures. Log one above.</p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1 pr-3 font-medium">When</th>
                <th className="py-1 pr-3 font-medium">Who</th>
                <th className="py-1 pr-3 font-medium">Type</th>
                <th className="py-1 pr-3 font-medium">Band</th>
                <th className="py-1 font-medium">Clocks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: OhImmExposure) => (
                <tr
                  key={r.uuid}
                  className={`cursor-pointer border-b border-border/60 ${selected === r.uuid ? "bg-primary/5" : ""}`}
                  onClick={() => setSelected(r.uuid)}
                >
                  <td className="py-1.5 pr-3 whitespace-nowrap">{r.exposed_at?.slice(0, 16).replace("T", " ")}</td>
                  <td className="py-1.5 pr-3 font-mono text-xs">{r.customer_initials}</td>
                  <td className="py-1.5 pr-3">{r.exposure_type}</td>
                  <td className="py-1.5 pr-3">
                    <span
                      className={
                        r.triage_band === "urgent"
                          ? "text-red-700"
                          : r.triage_band === "high"
                            ? "text-amber-700"
                            : ""
                      }
                    >
                      {r.triage_band}
                    </span>
                  </td>
                  <td className="py-1.5 text-xs">
                    {(r.clocks ?? [])
                      .map((c) => `${c.label}: ${formatClock(c.seconds_remaining)}`)
                      .join(" · ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {active ? (
        <section className="space-y-2 border-t border-border/60 pt-4">
          <h3 className="text-sm font-semibold text-primary">
            Incident actions · {active.exposure_type} · RCA {active.rca_uuid?.slice(0, 8)}
          </h3>
          <div className="flex flex-wrap gap-2">
            {["pep", "hbig", "vaccine", "tetanus", "lab_baseline", "consent_exposed"].map((a) => (
              <SecondaryButton
                key={a}
                type="button"
                className="h-8"
                onClick={() =>
                  void recordOhImmExposureAction(active.uuid, {
                    action_type: a,
                    consent_captured: a === "consent_exposed" || a === "lab_baseline",
                    performed_by: "OH",
                  })
                    .then(() => {
                      setMsg(`Recorded ${a}`);
                      void qc.invalidateQueries({ queryKey: ["oh-imm-exposures"] });
                    })
                    .catch((e: Error) => setMsg(e.message))
                }
              >
                {a === "pep" ? "HIV PEP" : a === "lab_baseline" ? "Baseline labs" : a.toUpperCase()}
              </SecondaryButton>
            ))}
            {active.source_known === "known" || active.source ? (
              <>
                <SecondaryButton
                  type="button"
                  className="h-8"
                  onClick={() =>
                    void updateOhImmExposureSource(active.uuid, { consent_status: "given", legal_basis_note: "Consent obtained" })
                      .then(() => setMsg("Source consent: given"))
                      .catch((e: Error) => setMsg(e.message))
                  }
                >
                  Source consent given
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  className="h-8"
                  onClick={() =>
                    void updateOhImmExposureSource(active.uuid, { consent_status: "refused" })
                      .then(() => setMsg("Source consent: refused"))
                      .catch((e: Error) => setMsg(e.message))
                  }
                >
                  Source refused
                </SecondaryButton>
              </>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">
            Billable PEP/HBIG/vaccine/labs need a visit on the incident (encounter_uuid). Actions without a product UUID are recorded without billing.
          </div>
          {(active.followups ?? []).length > 0 ? (
            <div className="pt-2">
              <p className="text-sm font-medium">Follow-ups</p>
              <ul className="text-sm text-muted-foreground">
                {(active.followups as Array<Record<string, unknown>>).map((f) => (
                  <li key={String(f.uuid)} className="flex flex-wrap items-center gap-2 py-0.5">
                    <span>
                      {String(f.label)} · due {String(f.due_date)} · {String(f.status)}
                    </span>
                    {f.status !== "done" ? (
                      <button
                        type="button"
                        className="text-primary underline"
                        onClick={() =>
                          void completeOhImmExposureFollowup(String(f.uuid)).then(() => {
                            void qc.invalidateQueries({ queryKey: ["oh-imm-exposures"] });
                            void qc.invalidateQueries({ queryKey: ["oh-imm-exp-followups"] });
                          })
                        }
                      >
                        Mark done
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Due follow-up labs</h3>
        {(followQ.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No exposure follow-ups due in the next 30 days.</p>
        ) : (
          <ul className="text-sm">
            {(followQ.data ?? []).map((f) => (
              <li key={String(f.uuid)} className="border-b border-border/60 py-1">
                {String(f.customer_initials)} · {String(f.label)} · {String(f.due_date)} · {String(f.exposure_type)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">24/7 on-call</h3>
        <p className="text-sm text-muted-foreground">
          Escalation list per site/shift. Notifications use the reminder channels; skipped_unconfigured when mail/SMS env is empty.
        </p>
        <ul className="text-sm">
          {(oncallQ.data ?? []).map((c) => (
            <li key={String(c.uuid)} className="border-b border-border/60 py-1">
              #{String(c.escalation_order)} {String(c.name)} · {String(c.site) || "any site"} · {String(c.shift)} ·{" "}
              {String(c.phone) || "—"} · {String(c.email) || "—"}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <input
            className="h-8 w-32 rounded border px-2 text-sm"
            placeholder="Name"
            value={oncall.name}
            onChange={(e) => setOncall((o) => ({ ...o, name: e.target.value }))}
          />
          <input
            className="h-8 w-28 rounded border px-2 text-sm"
            placeholder="Phone"
            value={oncall.phone}
            onChange={(e) => setOncall((o) => ({ ...o, phone: e.target.value }))}
          />
          <input
            className="h-8 w-40 rounded border px-2 text-sm"
            placeholder="Email"
            value={oncall.email}
            onChange={(e) => setOncall((o) => ({ ...o, email: e.target.value }))}
          />
          <input
            className="h-8 w-24 rounded border px-2 text-sm"
            placeholder="Site"
            value={oncall.site}
            onChange={(e) => setOncall((o) => ({ ...o, site: e.target.value }))}
          />
          <select
            className="h-8 rounded border px-2 text-sm"
            value={oncall.shift}
            onChange={(e) => setOncall((o) => ({ ...o, shift: e.target.value }))}
          >
            <option value="any">Any shift</option>
            <option value="day">Day</option>
            <option value="night">Night</option>
            <option value="weekend">Weekend</option>
          </select>
          <PrimaryButton type="button" className="h-8" onClick={() => addOncall.mutate()} disabled={addOncall.isPending}>
            Add contact
          </PrimaryButton>
        </div>
      </section>
    </div>
  );
}


function GovernancePanel() {
  const qc = useQueryClient();
  const zonesQ = useQuery({ queryKey: ["oh-imm-zones"], queryFn: fetchOhImmZones });
  const clientsQ = useQuery({ queryKey: ["oh-imm-access-clients"], queryFn: fetchOhImmAccessClients });
  const controlsQ = useQuery({ queryKey: ["oh-imm-controls"], queryFn: fetchOhImmControls });
  const tasksQ = useQuery({ queryKey: ["oh-imm-tasks"], queryFn: fetchOhImmTasks });
  const boardQ = useQuery({ queryKey: ["oh-imm-board"], queryFn: fetchOhImmBoardMembers });
  const accQ = useQuery({ queryKey: ["oh-imm-accommodations"], queryFn: () => fetchOhImmAccommodations() });
  const fitDueQ = useQuery({ queryKey: ["oh-imm-fit-due"], queryFn: () => fetchOhImmFitTestsDue(45) });
  const [msg, setMsg] = useState("");
  const [secretOnce, setSecretOnce] = useState("");
  const [zoneSel, setZoneSel] = useState("");
  const [clearance, setClearance] = useState<Array<Record<string, unknown>>>([]);
  const [hier, setHier] = useState<Record<string, unknown> | null>(null);
  const [decl, setDecl] = useState({ customer_uuid: "", vaccine_code: "HEPB", signed_by: "Employee" });

  const loading = zonesQ.isLoading || clientsQ.isLoading || controlsQ.isLoading || boardQ.isLoading || accQ.isLoading || fitDueQ.isLoading;
  const errored = zonesQ.isError || clientsQ.isError || controlsQ.isError || boardQ.isError || accQ.isError || fitDueQ.isError;

  if (loading) return <QuietLoading />;
  if (errored) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Could not load governance data. Check your connection and try again.
      </p>
    );
  }

  return (
    <div className="space-y-6" data-testid="oh-imm-governance-panel">
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      {secretOnce ? (
        <p className="text-sm text-amber-800">
          Client secret (shown once): <span className="font-mono">{secretOnce}</span>
        </p>
      ) : null}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Zone clearance</h3>
        <p className="text-sm text-muted-foreground">
          Privacy-shielded feed: cleared / not_cleared / expiring + valid_until only — no clinical detail.
        </p>
        <div className="flex flex-wrap gap-2">
          {(zonesQ.data ?? []).length === 0 ? (
            <EmptyAction title="No zones yet" description="Add labs, clean rooms, or wards with required vaccines and risk controls." />
          ) : null}
          <SecondaryButton type="button" className="h-8" onClick={() => void seedOhImmZones().then((r) => { setMsg(`Zones seeded (${r.seeded})`); void qc.invalidateQueries({ queryKey: ["oh-imm-zones"] }); }).catch((e: Error) => setMsg(e.message))}>
            Seed example zones
          </SecondaryButton>
          <select className="h-8 rounded border px-2 text-sm" value={zoneSel} onChange={(e) => setZoneSel(e.target.value)}>
            <option value="">Zone…</option>
            {(zonesQ.data ?? []).map((z) => (
              <option key={String(z.uuid)} value={String(z.uuid)}>{String(z.code)} — {String(z.name)}</option>
            ))}
          </select>
          <PrimaryButton type="button" className="h-8" disabled={!zoneSel} onClick={() => void fetchOhImmZoneClearance(zoneSel).then((rows) => setClearance(rows))}>
            View clearance
          </PrimaryButton>
        </div>
        {clearance.length > 0 ? (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-1">Employee</th><th>Status</th><th>Valid until</th></tr></thead>
            <tbody>
              {clearance.map((r) => (
                <tr key={String(r.customer_uuid)} className="border-b border-border/60">
                  <td className="py-1 font-mono text-xs">{String(r.customer_uuid).slice(0, 8)}</td>
                  <td>{String(r.status)}</td>
                  <td>{String(r.valid_until ?? "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Access clients (HMAC)</h3>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton type="button" className="h-8" onClick={() => void createOhImmAccessClient({ name: `HR card ${Date.now()}` }).then((r) => { setSecretOnce(r.secret); setMsg(`Client ${r.client.client_key}`); void qc.invalidateQueries({ queryKey: ["oh-imm-access-clients"] }); })}>
            Create client
          </PrimaryButton>
        </div>
        {(clientsQ.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No HMAC clients yet. Create one for HR or access-card systems (secret shown once).</p>
        ) : null}
        <ul className="text-sm">
          {(clientsQ.data ?? []).map((c) => (
            <li key={String(c.uuid)} className="border-b border-border/60 py-1 font-mono text-xs">
              {String(c.client_key)} · {String(c.name)} · webhook {c.has_webhook ? "yes" : "skipped_unconfigured"}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Hierarchy of controls</h3>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton type="button" className="h-8" onClick={() => void seedOhImmControls().then((r) => { setMsg(`Controls seeded (${r.seeded})`); void qc.invalidateQueries({ queryKey: ["oh-imm-controls"] }); })}>
            Seed controls
          </SecondaryButton>
          <select className="h-8 rounded border px-2 text-sm" onChange={(e) => { const v = e.target.value; if (v) void fetchOhImmTaskHierarchy(v).then(setHier); }}>
            <option value="">Task hierarchy…</option>
            {(tasksQ.data ?? []).map((task) => (
              <option key={task.uuid} value={task.uuid}>{task.code}</option>
            ))}
          </select>
        </div>
        {hier ? (
          <div className="space-y-1 text-sm">
            <p>Inherent {String(hier.inherent_score)} → residual {String(hier.residual_score)} ({String(hier.band)})</p>
            {Object.entries((hier.levels as Record<string, Array<Record<string, unknown>>>) ?? {}).map(([lvl, items]) => (
              <div key={lvl} className="border-l-2 border-primary/40 pl-2">
                <div className="font-medium capitalize">{lvl}</div>
                {items.length === 0 ? <div className="text-muted-foreground">—</div> : items.map((c) => <div key={String(c.uuid)}>{String(c.name)} (−{String(c.residual_risk_delta)})</div>)}
              </div>
            ))}
          </div>
        ) : (
          <ul className="text-sm text-muted-foreground">
            {(controlsQ.data ?? []).slice(0, 8).map((c) => (
              <li key={String(c.uuid)}>{String(c.level)} · {String(c.code)} · {String(c.name)}</li>
            ))}
          </ul>
        )}
        <div className="pt-2">
          <p className="text-sm font-medium">Fit-tests due</p>
          {(fitDueQ.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">None due.</p> : (
            <ul className="text-sm">{(fitDueQ.data ?? []).map((f) => <li key={String(f.uuid)}>{String(f.customer_uuid).slice(0, 8)} · expires {String(f.expires_on)} · {String(f.status)}</li>)}</ul>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <PrimaryButton type="button" className="h-8" onClick={() => {
              const customer = prompt("Employee UUID for fit-test");
              if (!customer) return;
              void createOhImmFitTest({ customer_uuid: customer, respirator_model: "N95", result: "pass", tested_by: "OH" }).then(() => { setMsg("Fit-test saved"); void qc.invalidateQueries({ queryKey: ["oh-imm-fit-due"] }); });
            }}>Record fit-test</PrimaryButton>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Declinations & medical board</h3>
        <p className="text-sm text-muted-foreground">Non-punitive informed declination → board decision → compliance / zone clearance.</p>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton type="button" className="h-8" onClick={() => void createOhImmBoardMember({ name: "OH Physician", role: "chair" }).then(() => void qc.invalidateQueries({ queryKey: ["oh-imm-board"] }))}>Add board chair</SecondaryButton>
          <input className="h-8 w-48 rounded border px-2 text-sm" placeholder="Employee UUID" value={decl.customer_uuid} onChange={(e) => setDecl((d) => ({ ...d, customer_uuid: e.target.value }))} />
          <PrimaryButton type="button" className="h-8" onClick={() => void fileOhImmDeclination({ ...decl, informed_signed: true }).then(() => { setMsg("Declination filed"); void qc.invalidateQueries({ queryKey: ["oh-imm-accommodations"] }); })}>File declination</PrimaryButton>
        </div>
        <ul className="text-sm">
          {(boardQ.data ?? []).map((m) => <li key={String(m.uuid)}>{String(m.role)} · {String(m.name)}</li>)}
        </ul>
        {(accQ.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No declinations or accommodations on file.</p>
        ) : null}
        <ul className="text-sm">
          {(accQ.data ?? []).map((a) => (
            <li key={String(a.uuid)} className="flex flex-wrap items-center gap-2 border-b border-border/60 py-1">
              <span className="font-mono text-xs">{String(a.vaccine_code)}</span>
              <span>{String(a.board_status)} {String(a.decision || "")}</span>
              {a.board_status === "pending" ? (
                <SecondaryButton type="button" className="h-7 px-2 text-xs" onClick={() => void decideOhImmAccommodation(String(a.uuid), { decision: "specialized_ppe", decided_by: "board", conditions: "PPE plan" }).then(() => void qc.invalidateQueries({ queryKey: ["oh-imm-accommodations"] }))}>Approve PPE</SecondaryButton>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function PdcaPanel() {
  const qc = useQueryClient();
  const boardQ = useQuery({ queryKey: ["oh-imm-pdca"], queryFn: fetchOhImmPdca });
  const seroQ = useQuery({ queryKey: ["oh-imm-sero"], queryFn: fetchOhImmSeroAudits });
  const vendorsQ = useQuery({ queryKey: ["oh-imm-vendors"], queryFn: fetchOhImmVendors });
  const [msg, setMsg] = useState("");
  const stages = ["plan", "do", "check", "act"] as const;

  const loading = boardQ.isLoading || seroQ.isLoading || vendorsQ.isLoading;
  const errored = boardQ.isError || seroQ.isError || vendorsQ.isError;
  if (loading) return <QuietLoading />;
  if (errored) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Could not load PDCA board. Check your connection and try again.
      </p>
    );
  }

  const totalRca = stages.reduce((n, s) => n + (((boardQ.data?.[s] as Array<Record<string, unknown>>) ?? []).length), 0);

  return (
    <div className="space-y-6" data-testid="oh-imm-pdca-panel">
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">PDCA board</h3>
        <p className="text-sm text-muted-foreground">Complete RCA stubs from exposures — team, 5-whys, fishbone, actions, effectiveness.</p>
        {totalRca === 0 ? (
          <EmptyAction title="No RCA items yet" description="Complete exposure RCAs from Exposures — stubs appear here under Plan." />
        ) : null}
        <div className="grid gap-3 md:grid-cols-4">
          {stages.map((stage) => (
            <div key={stage} className="min-h-[8rem] border-t-2 border-primary/50 pt-2">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">{stage}</div>
              {((boardQ.data?.[stage] as Array<Record<string, unknown>>) ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">Empty</p>
              ) : null}
              {((boardQ.data?.[stage] as Array<Record<string, unknown>>) ?? []).map((rca) => (
                <div key={String(rca.uuid)} className="mb-2 border-b border-border/60 pb-2 text-sm">
                  <div className="font-medium">{String(rca.status)}</div>
                  <div className="text-xs text-muted-foreground">{String(rca.summary || rca.uuid).slice(0, 80)}</div>
                  {stage === "plan" && rca.status === "stub" ? (
                    <SecondaryButton type="button" className="mt-1 h-7 px-2 text-xs" onClick={() => void updateOhImmRca(String(rca.uuid), {
                      team: { oh_physician: "OH MD", biosafety_officer: "BSO", line_manager: "LM" },
                      five_whys: ["Unsafe disposal", "No sharps near point of use", "Stockout", "Ordering lag", "No buffer stock"],
                      fishbone: { people: ["fatigue"], process: ["SOP gap"], equipment: ["no safety needle"] },
                      pdca_stage: "do",
                      summary: "RCA in progress",
                    }).then(() => { setMsg("RCA opened"); void qc.invalidateQueries({ queryKey: ["oh-imm-pdca"] }); })}>
                      Open RCA
                    </SecondaryButton>
                  ) : null}
                  {stage === "do" ? (
                    <SecondaryButton type="button" className="mt-1 h-7 px-2 text-xs" onClick={() => void addOhImmRcaAction(String(rca.uuid), { title: "Restock safety sharps", owner: "Ward lead", due_date: new Date(Date.now()+7*864e5).toISOString().slice(0,10), pdca_stage: "do" }).then(() => void qc.invalidateQueries({ queryKey: ["oh-imm-pdca"] }))}>
                      Add action
                    </SecondaryButton>
                  ) : null}
                  {stage === "do" || stage === "check" ? (
                    <SecondaryButton type="button" className="mt-1 h-7 px-2 text-xs" onClick={() => void updateOhImmRca(String(rca.uuid), { effectiveness_notes: "No repeat incidents in 30d", pdca_stage: "check" }).then(() => void qc.invalidateQueries({ queryKey: ["oh-imm-pdca"] }))}>
                      Effectiveness
                    </SecondaryButton>
                  ) : null}
                  {stage === "check" ? (
                    <SecondaryButton type="button" className="mt-1 h-7 px-2 text-xs" onClick={() => void updateOhImmRca(String(rca.uuid), { pdca_stage: "act", status: "complete" }).then(() => void qc.invalidateQueries({ queryKey: ["oh-imm-pdca"] }))}>
                      Close Act
                    </SecondaryButton>
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Seroprevalence audits</h3>
        <p className="text-sm text-muted-foreground">Aggregate results only; cells below k-anonymity threshold are hidden.</p>
        <PrimaryButton type="button" className="h-8" onClick={() => void createOhImmSeroAudit({ title: `Audit ${new Date().toISOString().slice(0,10)}`, cohort_type: "risk_band", cohort_value: "high", k_anonymity: 5 }).then((a) => {
          void recordOhImmSeroAggregates(String(a.uuid), [
            { cell: "high", n: 12, positive: 3 },
            { cell: "low", n: 3, positive: 1 },
          ]).then(() => { setMsg("Sero audit recorded (small cell hidden)"); void qc.invalidateQueries({ queryKey: ["oh-imm-sero"] }); });
        })}>Run sample audit</PrimaryButton>
        {(seroQ.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No seroprevalence audits yet. Results stay aggregate-only (k-anonymity).</p>
        ) : null}
        <ul className="text-sm">
          {(seroQ.data ?? []).map((s) => (
            <li key={String(s.uuid)}>{String(s.title)} · k={String(s.k_anonymity)} · {String(s.status)} · cells {Array.isArray((s.aggregate as { cells?: unknown[] } | null)?.cells) ? (s.aggregate as { cells: unknown[] }).cells.length : 0} · hidden {(s.aggregate as { hidden_cells?: number } | null)?.hidden_cells ?? "—"}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Cold-chain / vendors</h3>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton type="button" className="h-8" onClick={() => void createOhImmVendor({ code: "VACCO", name: "VacCo Supplies", audit_result: "pass", last_audit_on: new Date().toISOString().slice(0,10) }).then(() => void qc.invalidateQueries({ queryKey: ["oh-imm-vendors"] }))}>Add vendor</SecondaryButton>
          <PrimaryButton type="button" className="h-8" onClick={() => {
            const lot = prompt("Lot UUID to log (optional)");
            void recordOhImmColdChain({ storage_unit: "Fridge-1", temperature_c: 12, lot_uuid: lot || undefined, lot_number: "demo", recorded_by: "OH" }).then((r) => setMsg(r.excursion ? "Excursion — lot quarantined if provided" : "Temp OK"));
          }}>Log temp (excursion demo 12°C)</PrimaryButton>
        </div>
        <ul className="text-sm">{(vendorsQ.data ?? []).map((v) => <li key={String(v.uuid)}>{String(v.code)} · {String(v.name)} · {String(v.audit_result || "—")}</li>)}</ul>
      </section>
    </div>
  );
}
