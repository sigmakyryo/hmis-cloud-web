"use client";
import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppIcon } from "@/components/icons/app-icon";
import { PageActionButton, PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/providers/toast-provider";
import { QuietLoading } from "../shared/QuietLoading";
import { EmptyAction } from "../shared/EmptyAction";
import { Field } from "../shared/Field";
import { Drawer, DrawerActions } from "../shared/Drawer";
import { ListPageDataTableCell, ListPageDataTableRow } from "@/features/app-shell/components/page-layout";
import {
  ImmPrimaryCell,
  ImmRecordTable,
  ImmRowAction,
  ImmStatusBadge,
  humanize,
} from "../shared/ImmRecordTable";
import { ImmInsightStrip } from "../shared/ImmInsightStrip";
import { ImmFilterSelect, ImmSearchBar } from "../shared/ImmSearchBar";
import { ImmTabsBar } from "../shared/ImmTabsBar";
import { ImmCodeChips } from "../shared/ImmVisuals";
import { useImmList } from "../shared/use-imm-list";
import {
  type OhImmSchedule,
  createOhImmSchedule,
  previewOhImmAssignment,
  publishOhImmSchedule,
} from "@/features/occupational-health/services/immunisation.service";

type ScheduleStatus = "" | "published" | "draft";

function gateOf(schedule: OhImmSchedule): string {
  return String(schedule.published_version?.snapshot?.assignment?.fitness_gate ?? "off");
}

function seriesCodes(schedule: OhImmSchedule): string[] {
  return (schedule.published_version?.snapshot?.series ?? []).map((item) => String(item.vaccine_code ?? "")).filter(Boolean);
}

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
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<ScheduleStatus>("");
  const [gate, setGate] = useState("");

  const scheduleList = useImmList<OhImmSchedule>({
    rows: schedules.filter(
      (schedule) =>
        (category === "all" || schedule.category === category) &&
        (!status || (status === "published") === Boolean(schedule.published_version)) &&
        (!gate || gateOf(schedule) === gate),
    ),
    searchText: (schedule) => [schedule.name, schedule.code, schedule.description, ...seriesCodes(schedule)].join(" "),
    sortValue: (schedule, key) =>
      key === "version"
        ? (schedule.published_version?.number ?? null)
        : key === "vaccines"
          ? seriesCodes(schedule).length
          : key === "category"
            ? schedule.category
            : schedule.name,
    defaultSort: { key: "name", direction: "asc" },
  });

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

  const categories = Array.from(new Set(schedules.map((schedule) => schedule.category))).sort();
  const published = schedules.filter((schedule) => schedule.published_version).length;
  const blocking = schedules.filter((schedule) => gateOf(schedule) === "block").length;
  const examples = schedules.filter((schedule) => schedule.is_example).length;
  const toggleStatus = (next: Exclude<ScheduleStatus, "">) => setStatus((current) => (current === next ? "" : next));

  return (
    <>
      <ImmTabsBar
        label="Schedule categories"
        active={category}
        onChange={setCategory}
        tabs={[
          { key: "all", label: "All", count: schedules.length },
          ...categories.map((key) => ({
            key,
            label: humanize(key),
            count: schedules.filter((schedule) => schedule.category === key).length,
          })),
        ]}
        actions={
          <PageActionButton type="button" onClick={() => setShowCreate(true)}>
            <AppIcon name="add" className="size-3.5" />
            New schedule
          </PageActionButton>
        }
      />
      {schedules.length === 0 ? (
        <EmptyAction
          icon="calendar"
          title="No schedules yet"
          description="Load example packs from Due & overdue, or create a schedule for your facility."
        />
      ) : (
        <>
          <ImmInsightStrip
            testId="oh-imm-schedule-insights"
            items={[
              { label: "schedules", value: schedules.length, hint: `${examples} example packs` },
              {
                label: "published",
                value: published,
                tone: "success",
                onSelect: () => toggleStatus("published"),
                active: status === "published",
              },
              {
                label: "drafts",
                value: schedules.length - published,
                tone: schedules.length - published > 0 ? "warning" : "default",
                onSelect: () => toggleStatus("draft"),
                active: status === "draft",
              },
              {
                label: "block certificates",
                value: blocking,
                onSelect: () => setGate((current) => (current === "block" ? "" : "block")),
                active: gate === "block",
              },
            ]}
          />
          <ImmSearchBar
            value={scheduleList.query}
            onChange={scheduleList.setQuery}
            placeholder="Search schedule, code, or vaccine"
            matched={scheduleList.controls.matched}
            total={schedules.length}
            onClear={
              status || gate || scheduleList.query || category !== "all"
                ? () => {
                    setStatus("");
                    setGate("");
                    setCategory("all");
                    scheduleList.setQuery("");
                  }
                : undefined
            }
            filters={
              <>
                <ImmFilterSelect label="Status" value={status} onChange={(value) => setStatus(value as ScheduleStatus)}>
                  <option value="">Any status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </ImmFilterSelect>
                <ImmFilterSelect label="Fitness gate" value={gate} onChange={setGate}>
                  <option value="">Any gate</option>
                  <option value="off">Off</option>
                  <option value="warn">Warn</option>
                  <option value="block">Block</option>
                </ImmFilterSelect>
              </>
            }
          />
          {scheduleList.pageRows.length === 0 ? (
            <EmptyAction icon="search" title="No matching schedules" description="Change the search or filters." />
          ) : (
            <ImmRecordTable
              list={scheduleList.controls}
              columns={[
                { label: "Schedule", sortKey: "name" },
                { label: "Category", sortKey: "category" },
                { label: "Version", sortKey: "version" },
                { label: "Vaccines", sortKey: "vaccines" },
                "Fitness gate",
                "Status",
                "Actions",
              ]}
            >
              {scheduleList.pageRows.map((schedule) => {
                const version = schedule.published_version;
                const codes = seriesCodes(schedule);
                const scheduleGate = gateOf(schedule);
                return (
                  <ListPageDataTableRow key={schedule.uuid} className="cursor-pointer" onClick={() => setEditing(schedule)}>
                    <ListPageDataTableCell className="pl-4 md:pl-6">
                      <ImmPrimaryCell
                        title={schedule.name}
                        detail={
                          <>
                            <span className="font-mono">{schedule.code}</span>
                            {schedule.is_example ? " · Example" : ""}
                          </>
                        }
                      />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>{humanize(schedule.category)}</ListPageDataTableCell>
                    <ListPageDataTableCell className="tabular-nums">{version ? `v${version.number}` : "—"}</ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <ImmCodeChips codes={codes} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      {scheduleGate === "off" ? (
                        <span className="text-dash-muted">Off</span>
                      ) : (
                        <ImmStatusBadge status={scheduleGate === "block" ? "overdue" : "due"} label={humanize(scheduleGate)} />
                      )}
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <ImmStatusBadge status={version ? "published" : "draft"} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell className="pr-4 text-right md:pr-6">
                      <ImmRowAction onClick={() => setEditing(schedule)}>Edit rules</ImmRowAction>
                    </ListPageDataTableCell>
                  </ListPageDataTableRow>
                );
              })}
            </ImmRecordTable>
          )}
        </>
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
    </>
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
    <Drawer title="New schedule" description="Creates a draft. Add the vaccine series and publish when ready." onClose={onClose}>
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
      <DrawerActions>
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
      </DrawerActions>
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
    <Drawer
      title={`Edit · ${schedule.name}`}
      description="Assignment rules decide who this schedule applies to. Publishing pins the version."
      onClose={onClose}
      wide
    >
      <div className="space-y-3 border-b border-dash-border pb-4">
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
            className="space-y-2 border-b border-dash-border/70 pb-3"
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
      <DrawerActions>
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
      </DrawerActions>
    </Drawer>
  );
}




