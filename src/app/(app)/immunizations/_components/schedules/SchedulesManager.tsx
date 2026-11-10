"use client";
import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/providers/toast-provider";
import { QuietLoading } from "../shared/QuietLoading";
import { EmptyAction } from "../shared/EmptyAction";
import { Field } from "../shared/Field";
import { Drawer } from "../shared/Drawer";
import {
  type OhImmSchedule,
  createOhImmSchedule,
  previewOhImmAssignment,
  publishOhImmSchedule,
} from "@/features/occupational-health/services/immunisation.service";

export function SchedulesManager({
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




