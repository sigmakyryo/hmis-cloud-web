"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, LayoutGrid, List } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListPageActiveFilters, ListPageFilterButton, ListPageFilterChip, ListPageSearchField, ListPageLayout } from "@/features/app-shell/components/page-layout";
import { useToast } from "@/providers/toast-provider";
import { CatalogSearchSelect } from "@/features/occupational-health/components/CatalogSearchSelect";
import { OhFormGroupsBoard } from "@/features/occupational-health/components/OhFormGroupsBoard";
import type { BoardItem } from "@/features/occupational-health/lib/oh-form-groups-layout";
import {
  OH_FORM_FAMILIES,
  OH_PREDEFINED_FORM_TYPES,
  OPD_FORM_STAGES,
  type ClinicalFormRecord,
} from "@/features/occupational-health/lib/oh-form-catalog";
import {
  archiveClinicalForm,
  archiveOhCofTemplate,
  archiveOhEmployeeFormTemplate,
  archiveOhExamTemplate,
  createClinicalForm,
  createFormGroup,
  fetchClinicalForms,
  fetchFormGroups,
  fetchOhCofTemplates,
  fetchOhEmployeeFormTemplates,
  fetchOhExamTemplates,
  fetchOhVisitTypes,
  publishOhCofTemplate,
  publishOhEmployeeFormTemplate,
  publishOhExamTemplate,
  updateClinicalForm,
  updateOhCofTemplate,
  updateOhEmployeeFormTemplate,
  updateOhExamTemplate,
} from "@/features/occupational-health/services/oh.service";
import type { OhCofTemplate, OhExamTemplate } from "@/features/occupational-health/types";
import { ROUTES } from "@/constants/routes";
import { Fragment } from "react";
import { AlertDialog } from "radix-ui";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import {
  formsFiltersFromSearchParams,
  matchesFormsView,
  ohFormsHref,
  type OhFormsListFilters,
  type OhFormsStatus,
  type OhFormsView,
} from "@/features/occupational-health/utils/oh-forms-list-url";

type FormKind = "employee" | "exam" | "certificate" | "custom";
type FormStatus = "draft" | "published" | "archived";

type FormRow = {
  key: string;
  name: string;
  kind: FormKind;
  typeLabel: string;
  status: FormStatus;
  publishedVersion: number | null;
  groupName: string | null;
  groupUuid?: string | null;
  groupSortOrder: number;
  sortOrder: number;
  detail: string;
  templateKind: "employee" | "exam" | "certificate" | null;
  templateUuid: string | null;
  clinicalUuid: string | null;
};

const TYPE_FILTERS: Array<{ value: "all" | FormKind; label: string }> = [
  { value: "all", label: "All types" },
  { value: "exam", label: "Exam" },
  { value: "certificate", label: "COF" },
  { value: "employee", label: "Employee" },
  { value: "custom", label: "Custom" },
];

const STATUS_FILTERS: Array<{ value: OhFormsStatus; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];

const STATUS_TONE: Record<FormStatus, string> = {
  draft: "bg-slate-100 text-dash-muted",
  published: "bg-emerald-50 text-emerald-800",
  archived: "bg-slate-100 text-slate-500",
};

const TYPE_TONE: Record<FormKind, string> = {
  exam: "bg-sky-50 text-sky-800",
  certificate: "bg-violet-50 text-violet-800",
  employee: "bg-amber-50 text-amber-900",
  custom: "bg-slate-100 text-dash-muted",
};

async function invalidateFormCatalog(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["clinical-forms"] }),
    queryClient.invalidateQueries({ queryKey: ["oh-employee-form-templates"] }),
    queryClient.invalidateQueries({ queryKey: ["oh-exam-templates"] }),
    queryClient.invalidateQueries({ queryKey: ["oh-cof-templates"] }),
    queryClient.invalidateQueries({ queryKey: ["oh-templates"] }),
    queryClient.invalidateQueries({ queryKey: ["oh-hazard-profiles"] }),
    queryClient.invalidateQueries({ queryKey: ["oh-examinations"] }),
    queryClient.invalidateQueries({ queryKey: ["oh-cof-responses"] }),
    queryClient.invalidateQueries({ queryKey: ["oh-employee-form-responses"] }),
    queryClient.invalidateQueries({ queryKey: ["oh-exam-template-versions"] }),
    queryClient.invalidateQueries({ queryKey: ["oh-template-versions"] }),
  ]);
}

function applyPublishedVersion(
  queryClient: ReturnType<typeof useQueryClient>,
  templateUuid: string,
  version: { number: number; status: string },
) {
  const markList = <T extends { uuid?: string; template_uuid?: string | null; published_version_number?: number | null; published_version_status?: string | null }>(
    rows: T[] | undefined,
  ): T[] | undefined => {
    if (!rows) return rows;
    return rows.map((row) =>
      row.uuid === templateUuid || row.template_uuid === templateUuid
        ? { ...row, published_version_number: version.number, published_version_status: version.status }
        : row,
    );
  };
  queryClient.setQueriesData<ClinicalFormRecord[]>({ queryKey: ["clinical-forms"] }, markList);
  queryClient.setQueriesData({ queryKey: ["oh-employee-form-templates"] }, markList);
  queryClient.setQueriesData({ queryKey: ["oh-exam-templates"] }, markList);
  queryClient.setQueriesData({ queryKey: ["oh-cof-templates"] }, markList);
  queryClient.setQueriesData({ queryKey: ["oh-templates"] }, (data) => markBuilderPublished(data, templateUuid, version));
}

function markBuilderPublished(
  data: unknown,
  templateUuid: string,
  version: { number: number; status: string },
): unknown {
  if (Array.isArray(data)) {
    return data.map((row) => markBuilderPublished(row, templateUuid, version));
  }
  if (!data || typeof data !== "object") return data;
  const row = data as { uuid?: unknown; publishedVersionNumber?: unknown; published_version_number?: unknown };
  if (row.uuid !== templateUuid) return data;
  if (!("publishedVersionNumber" in row) && !("published_version_number" in row)) return data;
  return {
    ...row,
    publishedVersionNumber: version.number,
    publishedVersionStatus: version.status,
    published_version_number: version.number,
    published_version_status: version.status,
  };
}

export function OhFormsPage() {
  const queryClient = useQueryClient();
  const forms = useQuery({
    queryKey: ["clinical-forms", { includeInactive: true }],
    queryFn: () => fetchClinicalForms({ includeInactive: true }),
  });
  const employee = useQuery({
    queryKey: ["oh-employee-form-templates", { includeInactive: true }],
    queryFn: () => fetchOhEmployeeFormTemplates(true),
  });
  const exams = useQuery({
    queryKey: ["oh-exam-templates", { includeInactive: true }],
    queryFn: () => fetchOhExamTemplates(true),
  });
  const certificates = useQuery({
    queryKey: ["oh-cof-templates", { includeInactive: true }],
    queryFn: () => fetchOhCofTemplates(true),
  });
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [archiving, setArchiving] = useState<FormRow | null>(null);
  const [renaming, setRenaming] = useState<FormRow | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlFilters = formsFiltersFromSearchParams(searchParams);
  const [search, setSearchState] = useState(urlFilters.search);
  const typeFilter = urlFilters.type;
  const view = urlFilters.view;
  const statusFilter = urlFilters.status;
  const setFilters = (patch: Partial<OhFormsListFilters>) => {
    router.replace(ohFormsHref({ ...urlFilters, search, ...patch }), { scroll: false });
  };
  const setSearch = (value: string) => {
    setSearchState(value);
    router.replace(ohFormsHref({ ...urlFilters, search: value }), { scroll: false });
  };
  const setTypeFilter = (value: "all" | FormKind) => setFilters({ type: value });
  const setStatusFilter = (value: OhFormsStatus) => setFilters({ status: value });
  const setView = (value: OhFormsView) => setFilters({ view: value, status: "all" });
  const [actionError, setActionError] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      mergeFormRows(forms.data ?? [], employee.data ?? [], exams.data ?? [], certificates.data ?? []),
    [forms.data, employee.data, exams.data, certificates.data],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (typeFilter !== "all" && row.kind !== typeFilter) return false;
      if (!matchesFormsView(row.status, view, statusFilter)) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.typeLabel.toLowerCase().includes(q) ||
        (row.groupName ?? "").toLowerCase().includes(q) ||
        row.detail.toLowerCase().includes(q)
      );
    });
  }, [rows, search, typeFilter, statusFilter, view]);

  const archivedCount = rows.filter((row) => row.status === "archived").length;
  const liveCount = rows.length - archivedCount;
  const isLoading = forms.isLoading || employee.isLoading || exams.isLoading || certificates.isLoading;
  const isError = forms.isError || employee.isError || exams.isError || certificates.isError;
  const isEmpty = !isLoading && !isError && rows.length === 0;
  const noMatches = !isLoading && !isError && rows.length > 0 && filtered.length === 0;

  const publish = useMutation({
    mutationFn: (row: FormRow) => publishRow(row),
    onSuccess: async (version, row) => {
      setActionError(null);
      if (version?.number != null && row.templateUuid) {
        applyPublishedVersion(queryClient, row.templateUuid, {
          number: version.number,
          status: version.status ?? "published",
        });
      }
      toast({
        variant: "success",
        title:
          version?.number != null
            ? `Published v${version.number}. Visits use this snapshot.`
            : "Published.",
      });
      await invalidateFormCatalog(queryClient);
    },
    onError: () => setActionError("Could not publish the form."),
  });
  const groups = useQuery({ queryKey: ["form-groups"], queryFn: fetchFormGroups });
  const organising = urlFilters.layout === "groups" && view === "live";
  const setOrganising = (on: boolean) => setFilters({ layout: on ? "groups" : "list" });
  const boardItems = useMemo<BoardItem[]>(
    () =>
      rows.flatMap((row) => {
        if (row.status === "archived") return [];
        const ref = row.clinicalUuid
          ? { form_uuid: row.clinicalUuid }
          : row.templateKind && row.templateUuid
            ? { template_kind: row.templateKind, template_uuid: row.templateUuid }
            : null;
        if (!ref) return [];
        return [{
          key: row.key,
          name: row.name,
          typeLabel: row.typeLabel,
          statusLabel: statusLabel(row),
          groupUuid: row.groupUuid ?? null,
          sortOrder: row.sortOrder,
          ref,
        }];
      }),
    [rows],
  );

  const archive = useMutation({
    mutationFn: (row: FormRow) => archiveRow(row),
    onSuccess: async () => {
      setActionError(null);
      setArchiving(null);
      toast({ variant: "success", title: "Archived." });
      await invalidateFormCatalog(queryClient);
    },
    onError: () => setActionError("Could not archive the form."),
  });
  const restore = useMutation({
    mutationFn: (row: FormRow) => restoreRow(row),
    onSuccess: async () => {
      setActionError(null);
      toast({ variant: "success", title: "Restored." });
      await invalidateFormCatalog(queryClient);
    },
    onError: () => setActionError("Could not restore the form."),
  });

  return (
    <ListPageLayout data-testid="oh-forms-page">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {!organising ? (
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-sm">
              <ListPageSearchField id="oh-form-search" value={search} placeholder="Search forms" onChange={setSearch}
                onSubmit={() => setFilters({ search })} />
              <FormsFilters type={typeFilter} status={view === "live" ? statusFilter : "all"} showStatus={view === "live"}
                onApply={(type, status) => setFilters({ type, status })} />
            </div>
          ) : null}
          <ViewTabs view={view} liveCount={liveCount} archivedCount={archivedCount} onChange={setView} />
          <div className="ml-auto flex items-center gap-2">
            {view === "live" ? (
              <div className="inline-flex rounded-lg border border-dash-border p-0.5" role="group" aria-label="Forms layout">
                <button
                  type="button"
                  aria-pressed={!organising}
                  onClick={() => setOrganising(false)}
                  className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-medium", !organising ? "bg-brand-navy text-white" : "text-dash-muted hover:text-brand-navy")}
                >
                  <List className="size-3.5" aria-hidden="true" /> List
                </button>
                <button
                  type="button"
                  aria-pressed={organising}
                  data-testid="oh-forms-organise-groups"
                  onClick={() => setOrganising(true)}
                  className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-medium", organising ? "bg-brand-navy text-white" : "text-dash-muted hover:text-brand-navy")}
                >
                  <LayoutGrid className="size-3.5" aria-hidden="true" /> Organise groups
                </button>
              </div>
            ) : null}
            <PrimaryButton type="button" onClick={() => setOpen(true)}>
              New form
            </PrimaryButton>
          </div>
        </div>
        {!organising && (typeFilter !== "all" || (view === "live" && statusFilter !== "all")) ? (
          <ListPageActiveFilters onClearAll={() => setFilters({ type: "all", status: "all" })}>
            {typeFilter !== "all" ? <ListPageFilterChip label={TYPE_FILTERS.find((item) => item.value === typeFilter)?.label ?? typeFilter} onRemove={() => setTypeFilter("all")} /> : null}
            {view === "live" && statusFilter !== "all" ? <ListPageFilterChip label={STATUS_FILTERS.find((item) => item.value === statusFilter)?.label ?? statusFilter} onRemove={() => setStatusFilter("all")} /> : null}
          </ListPageActiveFilters>
        ) : null}
        {actionError ? <p className="text-[13px] text-red-700">{actionError}</p> : null}
        {isError ? <p className="text-[13px] text-red-700">Could not load forms.</p> : null}
        {isLoading ? <p className="text-[13px] text-dash-muted">Loading forms…</p> : null}
        {isEmpty ? (
          <EmptyState
            icon={FileText}
            title="No forms yet"
            description="Create a form to start building examinations, certificates of fitness, or employee questionnaires."
            action={
              <PrimaryButton type="button" onClick={() => setOpen(true)}>
                New form
              </PrimaryButton>
            }
            data-testid="oh-forms-empty"
          />
        ) : null}
        {noMatches ? (
          <p className="py-8 text-center text-[13px] text-dash-muted" data-testid="oh-forms-no-matches">
            {view === "archived" && archivedCount === 0 ? "No archived forms." : "No forms match those filters."}
          </p>
        ) : null}
        {organising && !isLoading && !isError ? (
          <OhFormGroupsBoard
            items={boardItems}
            groups={groups.data ?? []}
            onChanged={() => invalidateFormCatalog(queryClient)}
          />
        ) : null}
        {!organising && filtered.length > 0 ? (
          <div className="overflow-x-auto" data-testid="oh-forms-list">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-dash-border text-[11px] font-medium uppercase tracking-wide text-dash-muted">
                  <th className="px-2 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium">Type</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.toSorted(compareByGroupOrder).map((row, index, sorted) => (
                  <Fragment key={row.key}>
                    {index === 0 || sorted[index - 1].groupName !== row.groupName ? (
                      <tr className="border-y border-dash-border">
                        <th colSpan={4} scope="row" className="px-2 py-2 text-xs font-semibold text-brand-navy">
                          {row.groupName ?? "Ungrouped"}
                        </th>
                      </tr>
                    ) : null}
                  <tr key={row.key} className="border-b border-dash-border last:border-0" data-testid="oh-form-row">
                    <td className="px-2 py-2 align-top">
                      <p className="text-[13px] font-medium text-brand-navy">
                        {row.name}
                      </p>
                      {row.detail ? <p className="text-[12px] text-dash-muted">{row.detail}</p> : null}
                    </td>
                    <td className="px-2 py-2 align-top">
                      <Badge className={TYPE_TONE[row.kind]}>{row.typeLabel}</Badge>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <Badge className={STATUS_TONE[row.status]} testId="oh-form-status">
                        {statusLabel(row)}
                      </Badge>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                        {row.templateKind && row.templateUuid ? (
                          <Link
                            className="text-[13px] font-medium text-brand-primary"
                            href={ROUTES.ohTemplateBuilder(row.templateKind, row.templateUuid)}
                            title="Edit the working copy. Publish to snapshot a new version for visits."
                          >
                            Edit
                          </Link>
                        ) : null}
                        <RowAction onClick={() => setRenaming(row)}>Rename</RowAction>
                        {row.templateKind && row.templateUuid && row.status !== "archived" ? (
                          <RowAction
                            onClick={() => publish.mutate(row)}
                            disabled={publish.isPending}
                          >
                            Publish
                          </RowAction>
                        ) : null}
                        {row.status === "archived" ? (
                          <RowAction onClick={() => restore.mutate(row)} disabled={restore.isPending}>
                            Restore
                          </RowAction>
                        ) : (
                          <RowAction
                            onClick={() => setArchiving(row)}
                            disabled={archive.isPending}
                          >
                            Archive
                          </RowAction>
                        )}
                      </div>
                    </td>
                  </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
      <AlertDialog.Root open={archiving !== null} onOpenChange={(next) => {
        if (!next && !archive.isPending) setArchiving(null);
      }}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-brand-navy/40" />
          <AlertDialog.Content className={cn("dialog-content fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-md rounded-xl border border-dash-border bg-white p-6 shadow-xl", appFont.className)}>
            <AlertDialog.Title className="text-base font-semibold text-brand-navy">Archive {archiving?.name}?</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-dash-muted">
              This form will be unavailable for visits until it is restored. Saved responses will be kept.
            </AlertDialog.Description>
            {archive.isError ? <p className="mt-3 text-sm text-red-700" role="alert">Could not archive the form. Try again.</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <AlertDialog.Cancel disabled={archive.isPending} className="rounded-lg border border-dash-border px-3 py-2 text-sm">Cancel</AlertDialog.Cancel>
              <button type="button" disabled={archive.isPending} className="rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50" onClick={() => { if (archiving) archive.mutate(archiving); }}>
                {archive.isPending ? "Archiving…" : "Archive form"}
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      {open ? <CreateFormDialog onClose={() => setOpen(false)} /> : null}
      {renaming ? (
        <RenameFormDialog
          row={renaming}
          onClose={() => setRenaming(null)}
          onSaved={async () => {
            toast({ variant: "success", title: "Renamed." });
            setRenaming(null);
            await invalidateFormCatalog(queryClient);
          }}
        />
      ) : null}
    </ListPageLayout>
  );
}

function ViewTabs({
  view,
  liveCount,
  archivedCount,
  onChange,
}: {
  view: OhFormsView;
  liveCount: number;
  archivedCount: number;
  onChange: (view: OhFormsView) => void;
}) {
  const tabs: Array<{ value: OhFormsView; label: string; count: number }> = [
    { value: "live", label: "Live", count: liveCount },
    { value: "archived", label: "Archived", count: archivedCount },
  ];
  return (
    <div className="inline-flex border-b border-dash-border" role="tablist" aria-label="Live or archived forms" data-testid="oh-forms-view-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={view === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "inline-flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-[13px] font-medium transition-colors",
            view === tab.value ? "border-brand-primary text-brand-primary" : "border-transparent text-dash-muted hover:text-brand-navy",
          )}
        >
          {tab.label}
          <span className="tabular-nums text-[11px] text-dash-muted">{tab.count}</span>
        </button>
      ))}
    </div>
  );
}

function Badge({
  className,
  children,
  testId,
}: {
  className: string;
  children: string;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

function FormsFilters({ type, status, showStatus, onApply }: {
  type: "all" | FormKind;
  status: OhFormsStatus;
  showStatus: boolean;
  onApply: (type: "all" | FormKind, status: OhFormsStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ type, status });
  const activeCount = Number(type !== "all") + Number(status !== "all");

  function changeOpen(next: boolean) {
    if (next) setDraft({ type, status });
    setOpen(next);
  }

  function apply(nextType: "all" | FormKind, nextStatus: OhFormsStatus) {
    onApply(nextType, nextStatus);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <span><ListPageFilterButton activeCount={activeCount} onClick={() => changeOpen(true)} /></span>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className={cn("w-80 max-w-[calc(100vw-2rem)] rounded-xl border-dash-border p-0 shadow-xl", appFont.className)}>
        <h2 className="border-b border-dash-border px-4 py-2.5 text-sm font-semibold">Filters</h2>
        <div className="space-y-3 px-4 py-3">
          <FormFilterSelect id="oh-filter-type" label="Form type" value={draft.type} options={TYPE_FILTERS}
            onChange={(value) => setDraft({ ...draft, type: value })} />
          {showStatus ? <FormFilterSelect id="oh-filter-status" label="Publication status" value={draft.status} options={STATUS_FILTERS}
            onChange={(value) => setDraft({ ...draft, status: value })} /> : null}
        </div>
        <div className="flex justify-between border-t border-dash-border px-4 py-3">
          <SecondaryButton type="button" onClick={() => apply("all", "all")}>Reset</SecondaryButton>
          <PrimaryButton type="button" onClick={() => apply(draft.type, draft.status)}>Apply filters</PrimaryButton>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FormFilterSelect<T extends string>({ id, label, value, options, onChange }: {
  id: string;
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(next) => {
        const option = options.find((item) => item.value === next);
        if (option) onChange(option.value);
      }}>
        <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent className={appFont.className}>
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function RowAction({
  children,
  onClick,
  disabled,
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-[13px] font-medium text-brand-primary disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/** Groups in saved order (Ungrouped last), then forms in saved order, then by name. */
function compareByGroupOrder(left: FormRow, right: FormRow): number {
  const leftGrouped = left.groupName != null;
  const rightGrouped = right.groupName != null;
  if (leftGrouped !== rightGrouped) return leftGrouped ? -1 : 1;
  return (
    left.groupSortOrder - right.groupSortOrder ||
    (left.groupName ?? "").localeCompare(right.groupName ?? "") ||
    left.sortOrder - right.sortOrder ||
    left.name.localeCompare(right.name)
  );
}

function statusLabel(row: FormRow): string {
  if (row.status === "published" && row.publishedVersion != null) {
    return `Published v${row.publishedVersion}`;
  }
  if (row.status === "published") return "Published";
  if (row.status === "archived") return "Archived";
  return "Draft";
}

function mergeFormRows(
  clinical: ClinicalFormRecord[],
  employee: OhExamTemplate[],
  exams: OhExamTemplate[],
  certificates: OhCofTemplate[],
): FormRow[] {
  const linked = new Set(clinical.flatMap((form) => (form.template_uuid ? [form.template_uuid] : [])));
  const rows = clinical.map((form) => clinicalRow(form));
  for (const template of employee) {
    if (!linked.has(template.uuid)) rows.push(templateRow(template, "employee", "Employee form"));
  }
  for (const template of exams) {
    if (!linked.has(template.uuid)) rows.push(templateRow(template, "exam", "Examination"));
  }
  for (const template of certificates) {
    if (!linked.has(template.uuid)) rows.push(templateRow(template, "certificate", "Certificate of fitness"));
  }
  return rows.sort((left, right) => left.name.localeCompare(right.name));
}

function formStatus(active: boolean | undefined, published: number | null | undefined): FormStatus {
  if (active === false) return "archived";
  if (published != null) return "published";
  return "draft";
}

function kindFromForm(form: ClinicalFormRecord): FormKind {
  if (form.template_kind) return form.template_kind;
  if (form.system_type === "employee_form") return "employee";
  if (form.system_type === "examination") return "exam";
  if (form.system_type === "certificate") return "certificate";
  return "custom";
}

function typeLabelFor(kind: FormKind): string {
  if (kind === "employee") return "Employee";
  if (kind === "exam") return "Exam";
  if (kind === "certificate") return "COF";
  return "Custom";
}

function clinicalRow(form: ClinicalFormRecord): FormRow {
  const kind = kindFromForm(form);
  return {
    key: `form:${form.uuid}`,
    name: form.name,
    kind,
    typeLabel: typeLabelFor(kind),
    status: formStatus(form.active, form.published_version_number),
    publishedVersion: form.published_version_number ?? null,
    groupName: form.group?.name ?? null,
    groupUuid: form.group?.uuid ?? null,
    groupSortOrder: form.group?.sort_order ?? 0,
    sortOrder: form.sort_order ?? 0,
    detail: formDetail(form),
    templateKind: form.template_kind,
    templateUuid: form.template_uuid,
    clinicalUuid: form.uuid,
  };
}

function templateRow(
  template: OhExamTemplate | OhCofTemplate,
  kind: Exclude<FormKind, "custom">,
  detail: string,
): FormRow {
  return {
    key: `template:${kind}:${template.uuid}`,
    name: template.name,
    kind,
    typeLabel: typeLabelFor(kind),
    status: formStatus(template.active, template.published_version_number),
    publishedVersion: template.published_version_number ?? null,
    groupName: null,
    groupSortOrder: 0,
    sortOrder: 0,
    detail,
    templateKind: kind,
    templateUuid: template.uuid,
    clinicalUuid: null,
  };
}

function formDetail(form: ClinicalFormRecord) {
  const group = form.group?.name;
  if (form.family === "occupational_health") {
    const type = form.system_type?.replaceAll("_", " ") ?? "Occupational health";
    return group ? `${type} · ${group}` : type;
  }
  const placement = form.placement;
  let placed = `At ${placement?.parent?.toUpperCase() ?? "OPD"} ${placement?.stage ?? ""}`.trim();
  if (placement?.trigger === "onboarding") {
    placed = "Required when a client is added";
  } else if (placement?.trigger === "transition") {
    placed = `Required when moving from ${placement.from ?? "OPD"} to ${placement.to ?? "IPD"}`;
  }
  return group ? `${placed} · ${group}` : placed;
}

async function publishRow(row: FormRow) {
  if (!row.templateKind || !row.templateUuid) {
    throw new Error("This form has no template to publish.");
  }
  if (row.templateKind === "exam") return publishOhExamTemplate(row.templateUuid);
  if (row.templateKind === "certificate") return publishOhCofTemplate(row.templateUuid);
  return publishOhEmployeeFormTemplate(row.templateUuid);
}

async function archiveRow(row: FormRow) {
  if (row.clinicalUuid) {
    await archiveClinicalForm(row.clinicalUuid);
    return;
  }
  if (!row.templateKind || !row.templateUuid) return;
  if (row.templateKind === "exam") {
    await archiveOhExamTemplate(row.templateUuid);
    return;
  }
  if (row.templateKind === "certificate") {
    await archiveOhCofTemplate(row.templateUuid);
    return;
  }
  await archiveOhEmployeeFormTemplate(row.templateUuid);
}

async function restoreRow(row: FormRow) {
  if (row.clinicalUuid) {
    await updateClinicalForm(row.clinicalUuid, { active: true });
    return;
  }
  if (!row.templateKind || !row.templateUuid) return;
  if (row.templateKind === "exam") {
    await updateOhExamTemplate(row.templateUuid, { active: true });
    return;
  }
  if (row.templateKind === "certificate") {
    await updateOhCofTemplate(row.templateUuid, { active: true });
    return;
  }
  await updateOhEmployeeFormTemplate(row.templateUuid, { active: true });
}

async function renameRow(row: FormRow, name: string) {
  if (row.clinicalUuid) {
    await updateClinicalForm(row.clinicalUuid, { name });
    return;
  }
  if (!row.templateKind || !row.templateUuid) return;
  if (row.templateKind === "exam") {
    await updateOhExamTemplate(row.templateUuid, { name });
    return;
  }
  if (row.templateKind === "certificate") {
    await updateOhCofTemplate(row.templateUuid, { name });
    return;
  }
  await updateOhEmployeeFormTemplate(row.templateUuid, { name });
}

function RenameFormDialog({
  row,
  onClose,
  onSaved,
}: {
  row: FormRow;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(row.name);
  const save = useMutation({
    mutationFn: () => renameRow(row, name.trim()),
    onSuccess: () => onSaved(),
  });

  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4", appFont.className)}>
      <form
        className="w-full max-w-md space-y-4 rounded-md bg-white p-5 shadow-sm"
        data-testid="oh-rename-form-dialog"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) save.mutate();
        }}
      >
        <h2 className="text-base font-semibold text-brand-navy">Rename</h2>
        <div className="space-y-1.5">
          <Label>
            Name <RequiredFieldMarker />
          </Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
        </div>
        {save.isError ? <p className="text-sm text-red-700">Could not rename the form.</p> : null}
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={save.isPending || !name.trim()}>
            Save
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}

function CreateFormDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const visitTypes = useQuery({ queryKey: ["oh-visit-types"], queryFn: fetchOhVisitTypes });
  const groups = useQuery({ queryKey: ["form-groups"], queryFn: fetchFormGroups });
  const [family, setFamily] = useState<"occupational_health" | "custom">("occupational_health");
  const [name, setName] = useState("");
  const [systemType, setSystemType] = useState("");
  const [groupUuid, setGroupUuid] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [parent, setParent] = useState<"opd" | "ipd" | "registration">("opd");
  const [trigger, setTrigger] = useState<"stage" | "transition" | "onboarding">("stage");
  const [stage, setStage] = useState<string>(OPD_FORM_STAGES[0].value);
  const [required, setRequired] = useState(true);
  const createGroup = useMutation({
    mutationFn: createFormGroup,
    onSuccess: async (group) => {
      setGroupUuid(group.uuid);
      setGroupSearch("");
      await queryClient.invalidateQueries({ queryKey: ["form-groups"] });
    },
  });
  const create = useMutation({
    mutationFn: createClinicalForm,
    onSuccess: async () => {
      await invalidateFormCatalog(queryClient);
      onClose();
    },
  });
  const typeOptions = [
    ...OH_PREDEFINED_FORM_TYPES.map((type) => ({ value: type.value, label: type.label })),
    ...(visitTypes.data ?? []).map((type) => ({ value: type.code, label: type.name })),
  ];
  const selectedType = systemType || typeOptions[0]?.value || "";

  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4", appFont.className)}>
      <form
        className="w-full max-w-md space-y-4 rounded-md bg-white p-5 shadow-sm"
        data-testid="oh-create-form-dialog"
        onSubmit={(event) => {
          event.preventDefault();
          const placement = parent === "registration"
            ? { parent, trigger: "onboarding" as const, required }
            : {
                parent,
                trigger,
                stage: trigger === "stage" && parent === "opd" ? stage : null,
                from: trigger === "transition" ? "opd" : null,
                to: trigger === "transition" ? "ipd" : null,
                required,
              };
          create.mutate({
            name,
            family,
            form_group_uuid: groupUuid || null,
            ...(family === "occupational_health"
              ? { system_type: selectedType }
              : { placement }),
          });
        }}
      >
        <h2 className="text-base font-semibold text-brand-navy">New form</h2>
        <div className="space-y-1.5">
          <Label>Name <RequiredFieldMarker /></Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <CatalogSearchSelect
          label="Family"
          value={family}
          testId="oh-form-family-select"
          options={OH_FORM_FAMILIES.map((item) => ({ value: item.value, label: item.label }))}
          onValueChange={(value) => setFamily(value as "occupational_health" | "custom")}
        />
        {family === "occupational_health" ? (
          <CatalogSearchSelect
            label="Type"
            value={selectedType}
            testId="oh-form-type-select"
            options={typeOptions}
            onValueChange={setSystemType}
          />
        ) : (
          <>
            <CatalogSearchSelect
              label="Parent"
              value={parent}
              testId="oh-form-parent-select"
              options={[
                { value: "opd", label: "OPD" },
                { value: "ipd", label: "IPD" },
                { value: "registration", label: "Registration" },
              ]}
              onValueChange={(value) => {
                const next = value as "opd" | "ipd" | "registration";
                setParent(next);
                setTrigger(next === "registration" ? "onboarding" : "stage");
              }}
            />
            {parent === "registration" ? null : (
              <CatalogSearchSelect
                label="When"
                value={trigger}
                testId="oh-form-trigger-select"
                options={[
                  { value: "stage", label: "At a stage" },
                  { value: "transition", label: "When admitting from OPD to IPD" },
                ]}
                onValueChange={(value) => setTrigger(value as "stage" | "transition")}
              />
            )}
            {trigger === "stage" && parent === "opd" ? (
              <CatalogSearchSelect
                label="Stage"
                value={stage}
                testId="oh-form-stage-select"
                options={OPD_FORM_STAGES.map((item) => ({ value: item.value, label: item.label }))}
                onValueChange={setStage}
              />
            ) : null}
            <label className="flex items-center gap-2 text-[13px] text-brand-navy">
              <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} />
              Required before continuing
            </label>
          </>
        )}
        <CatalogSearchSelect
          label="Group"
          value={groupUuid}
          testId="oh-form-group-select"
          placeholder="Ungrouped"
          options={(groups.data ?? []).map((group) => ({ value: group.uuid, label: group.name }))}
          onValueChange={setGroupUuid}
          onSearchChange={setGroupSearch}
          footerExtra={groupSearch.trim() ? (
            <button type="button" className="text-[13px] font-medium text-brand-primary" onClick={() => createGroup.mutate(groupSearch.trim())}>
              Use “{groupSearch.trim()}”
            </button>
          ) : null}
        />
        {create.isError ? <p className="text-sm text-red-700">Could not create the form.</p> : null}
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={create.isPending || (family === "occupational_health" && !selectedType)}>Create</PrimaryButton>
        </div>
      </form>
    </div>
  );
}
