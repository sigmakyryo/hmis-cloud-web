"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { CheckField, Field, SelectField } from "@/app/(app)/immunizations/_components/shared/Field";
import { ImmEmployeeLink } from "@/app/(app)/immunizations/_components/shared/ImmEmployeeLink";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import {
  ImmPrimaryCell,
  ImmRecordTable,
  ImmRowAction,
  ImmStatusBadge,
} from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmFilterSelect, ImmSearchBar } from "@/app/(app)/immunizations/_components/shared/ImmSearchBar";
import { ImmTabsBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { useImmList } from "@/app/(app)/immunizations/_components/shared/use-imm-list";
import { DaCell, DaRow } from "@/app/(app)/drug-alcohol/_components/shared/da-ui";
import {
  createFitCourse,
  fetchFitCourses,
  fetchFitTraining,
  revokeFitTraining,
  seedFitCourses,
  updateFitCourse,
  type FitCourse,
  type FitTraining,
} from "@/features/occupational-health/services/fitness.service";
import { useToast } from "@/providers/toast-provider";
import { errorText, fmtDate } from "../shared/fit-format";

type Tab = "records" | "courses";

const STATE_TONE: Record<string, string> = { valid: "cleared", expiring: "expiring", expired: "expired", removed: "planned" };
const STATE_LABEL: Record<string, string> = { valid: "Valid", expiring: "Expires soon", expired: "Expired", removed: "Removed" };

const splitList = (text: string) =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

function CourseDrawer({ course, onClose }: { course: FitCourse | null; onClose: () => void }) {
  const { toast } = useToast();
  const client = useQueryClient();
  const [code, setCode] = useState(course?.code ?? "");
  const [name, setName] = useState(course?.name ?? "");
  const [months, setMonths] = useState(String(course?.validity_months ?? 24));
  const [all, setAll] = useState(course?.required_for_all ?? false);
  const [roles, setRoles] = useState((course?.required_roles ?? []).join(", "));
  const [departments, setDepartments] = useState((course?.required_departments ?? []).join(", "));
  const [sites, setSites] = useState((course?.required_sites ?? []).join(", "));
  const [zones, setZones] = useState((course?.required_zones ?? []).join(", "));
  const [onMissing, setOnMissing] = useState<FitCourse["on_missing"]>(course?.on_missing ?? "restricted");

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name,
        validity_months: Number(months) || 0,
        required_for_all: all,
        required_roles: splitList(roles),
        required_departments: splitList(departments),
        required_sites: splitList(sites),
        required_zones: splitList(zones).map((z) => z.toUpperCase()),
        on_missing: onMissing,
      };
      return course ? updateFitCourse(course.uuid, body) : createFitCourse({ ...body, code });
    },
    onSuccess: () => {
      toast({ variant: "success", title: course ? "Course updated" : "Course added" });
      void client.invalidateQueries({ queryKey: ["oh-fit"] });
      onClose();
    },
    onError: (error) => toast({ variant: "error", title: "Not saved", description: errorText(error) }),
  });

  return (
    <Drawer title={course ? course.name : "New course"} description="Who needs it and how long it lasts" onClose={onClose}>
      {course ? null : <Field label="Short code" value={code} onChange={setCode} placeholder="e.g. FIRST_AID" required />}
      <Field label="Course name" value={name} onChange={setName} required />
      <Field label="Valid for (months, 0 = never expires)" type="number" value={months} onChange={setMonths} />
      <CheckField label="Everyone needs this" checked={all} onChange={setAll} />
      <Field label="Job titles that need it (comma separated)" value={roles} onChange={setRoles} />
      <Field label="Departments that need it" value={departments} onChange={setDepartments} />
      <Field label="Sites that need it" value={sites} onChange={setSites} />
      <Field label="Area codes that need it (blocks area access when missing)" value={zones} onChange={setZones} />
      <SelectField label="If missing or expired" value={onMissing} onChange={(v) => setOnMissing(v as FitCourse["on_missing"])}>
        <option value="restricted">Fit with restrictions</option>
        <option value="not_fit">Not fit for the role</option>
      </SelectField>
      <DrawerActions>
        <SecondaryButton size="sm" onClick={onClose}>
          Cancel
        </SecondaryButton>
        <PageActionButton disabled={(!course && !code) || !name || save.isPending} onClick={() => save.mutate()}>
          Save
        </PageActionButton>
      </DrawerActions>
    </Drawer>
  );
}

export function FitTrainingPage() {
  const { toast } = useToast();
  const client = useQueryClient();
  const [tab, setTab] = useState<Tab>("records");
  const [state, setState] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [editing, setEditing] = useState<FitCourse | "new" | null>(null);
  const courses = useQuery({ queryKey: ["oh-fit", "courses"], queryFn: fetchFitCourses });
  const records = useQuery({
    queryKey: ["oh-fit", "training", state, courseFilter],
    queryFn: () => fetchFitTraining({ state, course_uuid: courseFilter }),
    enabled: tab === "records",
  });

  const list = useImmList<FitTraining>({
    rows: records.data ?? [],
    searchText: (row) => `${row.worker_label} ${row.course_name} ${row.provider} ${row.certificate_ref}`,
    sortValue: (row, key) => (key === "expires" ? row.expires_on : key === "issued" ? row.issued_on : row.course_name),
    defaultSort: { key: "expires", direction: "asc" },
  });

  const seed = useMutation({
    mutationFn: seedFitCourses,
    onSuccess: (data) => {
      toast({ variant: "success", title: "Example courses loaded", description: `${data.created} added. Edit them to match your sites.` });
      void client.invalidateQueries({ queryKey: ["oh-fit"] });
    },
    onError: (error) => toast({ variant: "error", title: "Not loaded", description: errorText(error) }),
  });
  const revoke = useMutation({
    mutationFn: (uuid: string) => {
      const reason = window.prompt("Why remove this record? (for example: entered twice)") ?? "";
      if (!reason.trim()) throw new Error("No reason given, nothing changed.");
      return revokeFitTraining(uuid, reason.trim());
    },
    onSuccess: () => {
      toast({ variant: "success", title: "Training record removed" });
      void client.invalidateQueries({ queryKey: ["oh-fit"] });
    },
    onError: (error) => toast({ variant: "error", title: "Not removed", description: errorText(error) }),
  });

  return (
    <ImmPageShell title="Training" testId="oh-fit-training-page">
      <ImmTabsBar<Tab>
        label="Training views"
        tabs={[
          { key: "records", label: "Records" },
          { key: "courses", label: "Courses", count: courses.data?.length },
        ]}
        active={tab}
        onChange={setTab}
        actions={
          tab === "courses" ? (
            <>
              <SecondaryButton size="sm" className="h-8" disabled={seed.isPending} onClick={() => seed.mutate()}>
                Load examples
              </SecondaryButton>
              <PageActionButton onClick={() => setEditing("new")}>New course</PageActionButton>
            </>
          ) : null
        }
      />
      {tab === "records" ? (
        <>
          <ImmSearchBar
            value={list.query}
            onChange={list.setQuery}
            placeholder="Search worker, course or provider"
            matched={list.controls.matched}
            total={list.total}
            onClear={() => list.setQuery("")}
            filters={
              <>
                <ImmFilterSelect label="Course" value={courseFilter} onChange={setCourseFilter}>
                  <option value="">All courses</option>
                  {(courses.data ?? []).map((c) => (
                    <option key={c.uuid} value={c.uuid}>
                      {c.name}
                    </option>
                  ))}
                </ImmFilterSelect>
                <ImmFilterSelect label="State" value={state} onChange={setState}>
                  <option value="">Any state</option>
                  <option value="expiring">Expires in 30 days</option>
                  <option value="expired">Expired</option>
                </ImmFilterSelect>
              </>
            }
          />
          {records.isLoading ? <QuietLoading /> : null}
          {records.isError ? <LoadError>{errorText(records.error, "Could not load training.")}</LoadError> : null}
          {records.isSuccess && list.controls.matched === 0 ? (
            <EmptyAction icon="book" title="No training records" description="Add training from a worker on the Fitness board." />
          ) : null}
          {records.isSuccess && list.controls.matched > 0 ? (
            <ImmRecordTable
              list={list.controls}
              columns={["Worker", { label: "Course", sortKey: "course" }, { label: "Passed", sortKey: "issued" }, { label: "Expires", sortKey: "expires" }, "State", "Actions"]}
            >
              {list.pageRows.map((row) => (
                <DaRow key={row.uuid} testId="oh-fit-training-row">
                  <DaCell first>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-brand-navy">{row.worker_label || "—"}</span>
                      <ImmEmployeeLink uuid={row.customer_uuid} />
                    </div>
                  </DaCell>
                  <DaCell>
                    <ImmPrimaryCell title={row.course_name ?? "—"} detail={row.provider || undefined} />
                  </DaCell>
                  <DaCell>{fmtDate(row.issued_on)}</DaCell>
                  <DaCell>{row.expires_on ? fmtDate(row.expires_on) : "Never"}</DaCell>
                  <DaCell>
                    <ImmStatusBadge status={STATE_TONE[row.state] ?? row.state} label={STATE_LABEL[row.state] ?? row.state} />
                  </DaCell>
                  <DaCell actions>
                    <ImmRowAction disabled={revoke.isPending} onClick={() => revoke.mutate(row.uuid)}>
                      Remove
                    </ImmRowAction>
                  </DaCell>
                </DaRow>
              ))}
            </ImmRecordTable>
          ) : null}
        </>
      ) : null}
      {tab === "courses" ? (
        <>
          {courses.isLoading ? <QuietLoading /> : null}
          {courses.isError ? <LoadError>{errorText(courses.error, "Could not load courses.")}</LoadError> : null}
          {courses.isSuccess && courses.data.length === 0 ? (
            <EmptyAction
              icon="book"
              title="No courses yet"
              description="Add the training each job or area needs, or load the examples."
              action={
                <PageActionButton disabled={seed.isPending} onClick={() => seed.mutate()}>
                  Load examples
                </PageActionButton>
              }
            />
          ) : null}
          {courses.isSuccess && courses.data.length > 0 ? (
            <ImmRecordTable columns={["Course", "Needed by", "Valid for", "If missing", "Actions"]}>
              {courses.data.map((c) => (
                <DaRow key={c.uuid} testId="oh-fit-course-row" onClick={() => setEditing(c)}>
                  <DaCell first>
                    <ImmPrimaryCell title={c.name} detail={c.is_example ? `${c.code} · example` : c.code} />
                  </DaCell>
                  <DaCell>
                    {c.required_for_all
                      ? "Everyone"
                      : [...c.required_roles, ...c.required_departments, ...c.required_sites, ...c.required_zones.map((z) => `Area ${z}`)].join(", ") || "Optional"}
                  </DaCell>
                  <DaCell>{c.validity_months > 0 ? `${c.validity_months} months` : "No expiry"}</DaCell>
                  <DaCell>{c.on_missing === "not_fit" ? "Not fit" : "Restricted"}</DaCell>
                  <DaCell actions>
                    <ImmRowAction onClick={() => setEditing(c)}>Edit</ImmRowAction>
                  </DaCell>
                </DaRow>
              ))}
            </ImmRecordTable>
          ) : null}
        </>
      ) : null}
      {editing ? <CourseDrawer course={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
    </ImmPageShell>
  );
}
