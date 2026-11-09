"use client";

import { useState, type ReactNode } from "react";
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
  fetchOhImmDue,
  fetchOhImmLots,
  fetchOhImmSchedules,
  fetchOhImmVaccines,
  publishOhImmSchedule,
  seedOhImmExamples,
  type OhImmSchedule,
  type OhVaccine,
  type OhVaccineLot,
} from "@/features/occupational-health/services/immunisation.service";
import { useToast } from "@/providers/toast-provider";
import { cn } from "@/lib/utils";

type HubTab = "due" | "catalog" | "schedules";

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
    queryFn: () => fetchOhImmDue(7),
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
              Vaccines, schedules, and who is due this week.
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
              ["due", "Due this week"],
              ["catalog", "Vaccines & lots"],
              ["schedules", "Schedules"],
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
    </ListPageLayout>
  );
}

function DuePanel({
  rows,
  loading,
}: {
  rows: Array<{
    customer_uuid: string;
    vaccine_name: string | null;
    vaccine_code: string;
    status: string;
    next_due_date: string | null;
    doses_received: number;
    doses_required: number | null;
  }>;
  loading: boolean;
}) {
  if (loading) return <QuietLoading />;
  if (rows.length === 0) {
    return (
      <EmptyAction
        title="Nobody is due this week"
        description="When schedules are assigned and doses fall due, they show up here."
      />
    );
  }
  return (
    <ul className="divide-y divide-dash-border rounded-md border border-dash-border bg-white">
      {rows.map((row) => (
        <li
          key={`${row.customer_uuid}-${row.vaccine_code}`}
          className="flex items-center justify-between gap-3 px-4 py-3"
        >
          <div>
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
      ))}
    </ul>
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
                assignment: {},
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
  const initial = schedule.published_version?.snapshot?.series ?? [];
  const [rows, setRows] = useState(
    initial.map((s) => ({
      vaccine_code: String(s.vaccine_code ?? ""),
      doses: Number(s.doses ?? 1),
      min_interval_days: Number(s.min_interval_days ?? 28),
      booster_years: s.booster_years != null ? Number(s.booster_years) : "",
    })),
  );

  return (
    <Drawer title={`Edit · ${schedule.name}`} onClose={onClose} wide>
      <p className="text-[13px] text-dash-muted">
        One row per vaccine. Publishing pins this version on new records.
      </p>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid grid-cols-4 gap-2 rounded-md border border-dash-border p-2"
          >
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
              assignment: schedule.published_version?.snapshot?.assignment ?? {},
              series: rows
                .filter((r) => r.vaccine_code.trim())
                .map((r) => ({
                  vaccine_code: r.vaccine_code.trim().toUpperCase(),
                  doses: r.doses,
                  min_interval_days: r.min_interval_days,
                  ...(r.booster_years !== ""
                    ? { booster_years: Number(r.booster_years) }
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
