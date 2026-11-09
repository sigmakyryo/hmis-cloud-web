"use client";

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
import { cn } from "@/lib/utils";

type HubTab = "due" | "catalog" | "schedules" | "compliance" | "tools";

const STATUS_LABEL: Record<string, string> = {
  up_to_date: "Up to date",
  due: "Due",
  overdue: "Overdue",
  exempt: "Exempt",
  non_responder: "Non-responder",
};

export function OhImmunizationsHubPage() {
  const [tab, setTab] = useState<HubTab>("due");
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
              ["tools", "Exports & audit"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
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
