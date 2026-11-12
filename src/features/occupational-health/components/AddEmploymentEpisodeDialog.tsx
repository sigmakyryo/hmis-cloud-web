"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";

import { UserIdenticon } from "@/components/UserIdenticon";
import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import { SearchableSelect, SelectItem } from "@/components/ui/searchable-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ROUTES } from "@/constants/routes";
import { formatCustomerName } from "@/features/customers/utils/format-customer";
import type { Customer } from "@/features/customers/types/customer.types";
import {
  createEmploymentEpisode,
  createOhEmployer,
  createOhEmployerDepartment,
  createOhEmployerSite,
  createOhHazardProfile,
  createOhJobTitle,
  fetchOhEmployerDepartments,
  fetchOhEmployerSites,
  fetchOhEmployers,
  fetchOhHazardProfiles,
  fetchOhJobTitles,
  updateOhJobTitle,
} from "@/features/occupational-health/services/oh.service";
import type {
  OhEmployer,
  OhEmployerDepartment,
  OhEmployerSite,
  OhHazardProfile,
  OhJobTitle,
} from "@/features/occupational-health/types";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

type AddEmploymentEpisodeDialogProps = {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

const NONE = "none";

export function AddEmploymentEpisodeDialog({
  customer,
  open,
  onOpenChange,
  onCreated,
}: AddEmploymentEpisodeDialogProps) {
  const { toast } = useToast();
  const customerName = formatCustomerName(customer);
  const [wasOpen, setWasOpen] = useState(open);
  const [employers, setEmployers] = useState<OhEmployer[]>([]);
  const [jobTitles, setJobTitles] = useState<OhJobTitle[]>([]);
  const [sites, setSites] = useState<OhEmployerSite[]>([]);
  const [departments, setDepartments] = useState<OhEmployerDepartment[]>([]);
  const [hazardProfiles, setHazardProfiles] = useState<OhHazardProfile[]>([]);
  const [employerId, setEmployerId] = useState("");
  const [employerLabel, setEmployerLabel] = useState("");
  const [jobTitleId, setJobTitleId] = useState("");
  const [jobTitleLabel, setJobTitleLabel] = useState("");
  const [siteId, setSiteId] = useState("");
  const [siteLabel, setSiteLabel] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departmentLabel, setDepartmentLabel] = useState("");
  const [hazardProfileId, setHazardProfileId] = useState("");
  const [hazardProfileLabel, setHazardProfileLabel] = useState("");
  const [catalogEmployerId, setCatalogEmployerId] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employerOpen, setEmployerOpen] = useState(false);
  const [jobOpen, setJobOpen] = useState(false);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [siteOpen, setSiteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [employerSearch, setEmployerSearch] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [siteSearch, setSiteSearch] = useState("");
  const [profileSearch, setProfileSearch] = useState("");
  const [jobRiskPrompt, setJobRiskPrompt] = useState<OhJobTitle | null>(null);
  const [savingJobRisk, setSavingJobRisk] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setEmployerId("");
      setEmployerLabel("");
      setJobTitleId("");
      setJobTitleLabel("");
      setSiteId("");
      setSiteLabel("");
      setDepartmentId("");
      setDepartmentLabel("");
      setHazardProfileId("");
      setHazardProfileLabel("");
      setCatalogEmployerId("");
      setCatalogLoading(false);
      setEmployeeNumber("");
      setStartDate(new Date().toISOString().slice(0, 10));
      setJobTitles([]);
      setSites([]);
      setDepartments([]);
      setHazardProfiles([]);
      setJobRiskPrompt(null);
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function loadEmployers() {
      const employerRows = await fetchOhEmployers();
      if (!cancelled) {
        setEmployers((current) => mergeById(employerRows, current));
      }
    }

    void loadEmployers();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !employerId) {
      return;
    }

    let cancelled = false;

    async function loadEmployerCatalog() {
      const employerPk = Number(employerId);
      try {
        const [jobRows, siteRows, departmentRows, hazardRows] = await Promise.all([
          fetchOhJobTitles(employerPk),
          fetchOhEmployerSites(employerPk),
          fetchOhEmployerDepartments(employerPk),
          fetchOhHazardProfiles(employerPk),
        ]);
        if (cancelled) {
          return;
        }
        setJobTitles((current) => mergeById(jobRows, current));
        setSites((current) => mergeById(siteRows, current));
        setDepartments((current) => mergeById(departmentRows, current));
        setHazardProfiles((current) => mergeById(hazardRows, current));
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    }

    void loadEmployerCatalog();
    return () => {
      cancelled = true;
    };
  }, [employerId, open]);

  if (catalogEmployerId !== employerId) {
    setCatalogEmployerId(employerId);
    setCatalogLoading(Boolean(employerId));
    setJobTitleId("");
    setJobTitleLabel("");
    setSiteId("");
    setSiteLabel("");
    setDepartmentId("");
    setDepartmentLabel("");
    setHazardProfileId("");
    setHazardProfileLabel("");
    setJobTitles([]);
    setSites([]);
    setDepartments([]);
    setHazardProfiles([]);
  }

  const employerName =
    employers.find((row) => String(row.id) === employerId)?.name ??
    (employerId ? employerLabel : undefined);
  const selectedEmployer = employers.find((row) => String(row.id) === employerId);
  const jobName =
    jobTitles.find((row) => String(row.id) === jobTitleId)?.title ??
    (jobTitleId ? jobTitleLabel : undefined);
  const departmentName =
    departments.find((row) => String(row.id) === departmentId)?.name ??
    (departmentId ? departmentLabel : undefined);
  const siteName =
    sites.find((row) => String(row.id) === siteId)?.name ??
    (siteId ? siteLabel : undefined);
  const profileName =
    hazardProfiles.find((row) => String(row.id) === hazardProfileId)?.name ??
    (hazardProfileId ? hazardProfileLabel : undefined);

  const filteredEmployers = filterByLabel(employers, employerSearch, (row) => row.name);
  const filteredJobs = filterByLabel(jobTitles, jobSearch, (row) => row.title);
  const filteredDepartments = filterByLabel(
    departments,
    departmentSearch,
    (row) => row.name,
  );
  const filteredSites = filterByLabel(sites, siteSearch, (row) => row.name);
  const filteredProfiles = filterByLabel(
    hazardProfiles,
    profileSearch,
    (row) => row.name,
  );

  const canSave = Boolean(
    employerId && jobTitleId && hazardProfileId && startDate && !isSubmitting,
  );
  const employerPk = Number(employerId);

  async function createNamed<T extends { id: number }>(
    create: () => Promise<T>,
    add: (created: T) => void,
    select: (created: T) => void,
    failureTitle: string,
  ) {
    try {
      const created = await create();
      add(created);
      select(created);
    } catch (error) {
      toast({
        title: failureTitle,
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
      throw error;
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) {
      return;
    }
    setIsSubmitting(true);
    try {
      const selectedSite = sites.find((row) => String(row.id) === siteId);
      const selectedDepartment = departments.find(
        (row) => String(row.id) === departmentId,
      );
      await createEmploymentEpisode({
        customer: customer.id,
        customer_uuid: customer.uuid,
        employer: Number(employerId),
        job_title: Number(jobTitleId),
        hazard_profile: Number(hazardProfileId),
        start_date: startDate,
        site: selectedSite?.name ?? "",
        department_name: selectedDepartment?.name ?? "",
        employee_number: employeeNumber,
        employment_type: "employee",
      });
      toast({ variant: "success", title: "Employment episode created" });
      onOpenChange(false);
      onCreated();
    } catch (error) {
      toast({
        title: "Could not create employment episode",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const riskProfileHref = selectedEmployer
    ? ROUTES.settingsOccupationalHealthEmployer(selectedEmployer.uuid)
    : ROUTES.settingsModuleOccupationalHealth;

  async function assignJobRisk(profile: OhHazardProfile) {
    if (!jobRiskPrompt) return;
    setSavingJobRisk(true);
    try {
      const updated = await updateOhJobTitle(jobRiskPrompt.uuid, {
        employer: Number(employerId),
        hazard_profile: profile.id,
      });
      setJobTitles((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
      setJobTitleId(String(updated.id));
      setJobTitleLabel(updated.title);
      setHazardProfileId(String(profile.id));
      setHazardProfileLabel(profile.name);
      setJobRiskPrompt(null);
    } catch (error) {
      toast({
        title: "Could not assign risk profile",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setSavingJobRisk(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          appFont.className,
          "flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl",
        )}
        data-testid="add-employment-episode-sheet"
      >
        <SheetHeader className="space-y-0 border-b border-dash-border/70 px-6 py-5 pr-14 text-left">
          <div className="flex items-center gap-3.5">
            <UserIdenticon
              seed={customer.customer_identifier || customerName}
              name={customerName}
              className="size-11 shrink-0 rounded-xl"
              fallbackClassName="text-sm font-semibold"
            />
            <div className="min-w-0">
              <SheetTitle className="text-sm font-medium text-dash-muted">
                Add employment episode
              </SheetTitle>
              <p className="truncate text-base font-semibold tracking-tight text-brand-navy">
                {customerName}
              </p>
              {customer.customer_identifier ? (
                <p className="mt-0.5 truncate text-sm text-dash-muted">
                  {customer.customer_identifier}
                </p>
              ) : null}
            </div>
          </div>
          <SheetDescription className="sr-only">
            Record an employment episode and risk profile for {customerName}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <CatalogSelect
              id="oh-employer"
              label="Employer"
              required
              side={
                <Link
                  href={ROUTES.settingsModuleOccupationalHealth}
                  onClick={() => onOpenChange(false)}
                  className="text-xs text-brand-primary hover:underline"
                >
                  Manage employers
                </Link>
              }
              value={employerId}
              displayValue={employerName}
              placeholder="Select employer"
              search={employerSearch}
              onSearch={setEmployerSearch}
              searchPlaceholder="Search employers"
              open={employerOpen}
              onOpenChange={setEmployerOpen}
              onChange={(id) => {
                setEmployerId(id);
                setEmployerLabel(
                  employers.find((row) => String(row.id) === id)?.name ?? employerLabel,
                );
              }}
              emptyMessage="No employers found"
              optionLabels={employers.map((employer) => employer.name)}
              onCreate={(name) =>
                createNamed(
                  () => createOhEmployer({ name }),
                  (created) =>
                    setEmployers((rows) =>
                      rows.some((row) => row.id === created.id)
                        ? rows
                        : [...rows, created],
                    ),
                  (created) => {
                    setEmployerId(String(created.id));
                    setEmployerLabel(created.name);
                  },
                  "Could not create employer",
                )
              }
            >
              {filteredEmployers.map((employer) => (
                <SelectItem key={employer.uuid} value={String(employer.id)}>
                  {employer.name}
                </SelectItem>
              ))}
            </CatalogSelect>

            <CatalogSelect
              id="oh-job-title"
              label="Job title"
              required
              value={jobTitleId}
              displayValue={jobName}
              placeholder={employerId ? "Select job title" : "Select an employer first"}
              search={jobSearch}
              onSearch={setJobSearch}
              searchPlaceholder="Search job titles"
              open={jobOpen}
              onOpenChange={setJobOpen}
              onChange={(id) => {
                setJobTitleId(id);
                setJobTitleLabel(
                  jobTitles.find((row) => String(row.id) === id)?.title ?? jobTitleLabel,
                );
              }}
              disabled={!employerId}
              emptyMessage="No job titles for this employer"
              optionLabels={jobTitles.map((job) => job.title)}
              onCreate={
                employerId
                  ? (name) =>
                      createNamed(
                        () =>
                          createOhJobTitle({
                            title: name,
                            employer: employerPk,
                          }),
                        (created) =>
                          setJobTitles((rows) =>
                            rows.some((row) => row.id === created.id)
                              ? rows
                              : [...rows, created],
                          ),
                        (created) => {
                          setJobTitleId(String(created.id));
                          setJobTitleLabel(created.title);
                          setJobSearch("");
                          setJobRiskPrompt(created);
                        },
                        "Could not create job title",
                      )
                  : undefined
              }
            >
              {filteredJobs.map((job) => (
                <SelectItem key={job.uuid} value={String(job.id)}>
                  {job.title}
                </SelectItem>
              ))}
            </CatalogSelect>

            <CatalogSelect
              id="oh-department"
              label="Department"
              value={departmentId || NONE}
              displayValue={departmentName ?? "No department"}
              placeholder="Optional"
              search={departmentSearch}
              onSearch={setDepartmentSearch}
              searchPlaceholder="Search departments"
              open={departmentOpen}
              onOpenChange={setDepartmentOpen}
              onChange={(value) => {
                const next = value === NONE ? "" : value;
                setDepartmentId(next);
                setDepartmentLabel(
                  next
                    ? (departments.find((row) => String(row.id) === next)?.name ??
                      departmentLabel)
                    : "",
                );
              }}
              disabled={!employerId}
              emptyMessage="No departments for this employer"
              optionLabels={departments.map((row) => row.name)}
              onCreate={
                employerId
                  ? (name) =>
                      createNamed(
                        () =>
                          createOhEmployerDepartment({
                            name,
                            employer: employerPk,
                          }),
                        (created) =>
                          setDepartments((rows) =>
                            rows.some((row) => row.id === created.id)
                              ? rows
                              : [...rows, created],
                          ),
                        (created) => {
                          setDepartmentId(String(created.id));
                          setDepartmentLabel(created.name);
                        },
                        "Could not create department",
                      )
                  : undefined
              }
            >
              <SelectItem value={NONE}>No department</SelectItem>
              {filteredDepartments.map((row) => (
                <SelectItem key={row.uuid} value={String(row.id)}>
                  {row.name}
                </SelectItem>
              ))}
            </CatalogSelect>

            <CatalogSelect
              id="oh-site"
              label="Site"
              value={siteId || NONE}
              displayValue={siteName ?? "No site"}
              placeholder="Optional"
              search={siteSearch}
              onSearch={setSiteSearch}
              searchPlaceholder="Search sites"
              open={siteOpen}
              onOpenChange={setSiteOpen}
              onChange={(value) => {
                const next = value === NONE ? "" : value;
                setSiteId(next);
                setSiteLabel(
                  next
                    ? (sites.find((row) => String(row.id) === next)?.name ?? siteLabel)
                    : "",
                );
              }}
              disabled={!employerId}
              emptyMessage="No sites for this employer"
              optionLabels={sites.map((row) => row.name)}
              onCreate={
                employerId
                  ? (name) =>
                      createNamed(
                        () =>
                          createOhEmployerSite({
                            name,
                            employer: employerPk,
                          }),
                        (created) =>
                          setSites((rows) =>
                            rows.some((row) => row.id === created.id)
                              ? rows
                              : [...rows, created],
                          ),
                        (created) => {
                          setSiteId(String(created.id));
                          setSiteLabel(created.name);
                        },
                        "Could not create site",
                      )
                  : undefined
              }
            >
              <SelectItem value={NONE}>No site</SelectItem>
              {filteredSites.map((row) => (
                <SelectItem key={row.uuid} value={String(row.id)}>
                  {row.name}
                </SelectItem>
              ))}
            </CatalogSelect>

            <CatalogSelect
              id="oh-risk-profile"
              label="Risk profile"
              required
              hint={
                employerId && hazardProfiles.length === 0
                  ? "This employer has no risk profiles yet."
                  : "This selects the COF and exam templates for visits."
              }
              value={hazardProfileId}
              displayValue={profileName}
              placeholder={employerId ? "Select risk profile" : "Select an employer first"}
              search={profileSearch}
              onSearch={setProfileSearch}
              searchPlaceholder="Search risk profiles"
              open={profileOpen}
              onOpenChange={setProfileOpen}
              onChange={(id) => {
                setHazardProfileId(id);
                setHazardProfileLabel(
                  hazardProfiles.find((row) => String(row.id) === id)?.name ??
                    hazardProfileLabel,
                );
              }}
              disabled={!employerId}
              emptyMessage="No risk profiles for this employer"
              optionLabels={hazardProfiles.map((profile) => profile.name)}
              side={
                employerId && hazardProfiles.length === 0 && selectedEmployer ? (
                  <Link
                    href={riskProfileHref}
                    onClick={() => onOpenChange(false)}
                    className="text-xs text-brand-primary hover:underline"
                  >
                    Create a risk profile
                  </Link>
                ) : null
              }
              onCreate={
                employerId
                  ? (name) =>
                      createNamed(
                        () =>
                          createOhHazardProfile({
                            name,
                            employer: employerPk,
                          }),
                        (created) =>
                          setHazardProfiles((rows) =>
                            rows.some((row) => row.id === created.id)
                              ? rows
                              : [...rows, created],
                          ),
                        (created) => {
                          setHazardProfileId(String(created.id));
                          setHazardProfileLabel(created.name);
                        },
                        "Could not create risk profile",
                      )
                  : undefined
              }
            >
              {filteredProfiles.map((profile) => (
                <SelectItem key={profile.uuid} value={String(profile.id)}>
                  {profile.name}
                </SelectItem>
              ))}
            </CatalogSelect>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="oh-start-date" className="text-sm font-medium">
                  Start date <RequiredFieldMarker />
                </label>
                <Input
                  id="oh-start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="oh-employee-number" className="text-sm font-medium">
                  Employee number
                </label>
                <Input
                  id="oh-employee-number"
                  value={employeeNumber}
                  placeholder="Optional"
                  onChange={(event) => setEmployeeNumber(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-dash-border/60 bg-white px-6 py-4">
            <SecondaryButton type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={!canSave}>
              {isSubmitting ? "Saving…" : "Create episode"}
            </PrimaryButton>
          </div>
        </form>
        {jobRiskPrompt ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-brand-navy/35 p-6"
            role="alertdialog"
            aria-labelledby="job-risk-title"
            aria-describedby="job-risk-description"
          >
            <div className="w-full max-w-sm rounded-xl border border-dash-border bg-white p-5 shadow-xl">
              <h3 id="job-risk-title" className="text-[15px] font-semibold text-brand-navy">
                Select a risk profile
              </h3>
              <p id="job-risk-description" className="mt-1 text-[13px] leading-relaxed text-dash-muted">
                {jobRiskPrompt.title} is selected. Choose the risk profile this role uses.
              </p>
              {catalogLoading ? (
                <p className="mt-4 text-[13px] text-dash-muted">Loading risk profiles…</p>
              ) : hazardProfiles.length === 0 ? (
                <div className="mt-4 space-y-3">
                  <p className="text-[13px] text-brand-navy">
                    This employer has no risk profiles yet.
                  </p>
                  <Link
                    href={riskProfileHref}
                    onClick={() => onOpenChange(false)}
                    className="inline-flex text-[13px] font-medium text-brand-primary hover:underline"
                  >
                    Create a risk profile
                  </Link>
                </div>
              ) : (
                <ul className="mt-4 max-h-56 space-y-1 overflow-y-auto">
                  {hazardProfiles.map((profile) => (
                    <li key={profile.uuid}>
                      <button
                        type="button"
                        disabled={savingJobRisk}
                        onClick={() => void assignJobRisk(profile)}
                        className="w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium text-brand-navy hover:bg-brand-tint disabled:opacity-60"
                      >
                        {profile.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex justify-end">
                <SecondaryButton
                  type="button"
                  onClick={() => setJobRiskPrompt(null)}
                  disabled={savingJobRisk}
                >
                  Not now
                </SecondaryButton>
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function mergeById<T extends { id: number }>(fetched: T[], current: T[]): T[] {
  const fetchedIds = new Set(fetched.map((row) => row.id));
  return [...fetched, ...current.filter((row) => !fetchedIds.has(row.id))];
}

function nameToCreate(search: string, labels: string[]): string | null {
  const trimmed = search.trim();
  if (!trimmed) {
    return null;
  }
  const exists = labels.some(
    (label) => label.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  return exists ? null : trimmed;
}

function filterByLabel<T>(rows: T[], query: string, label: (row: T) => string): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return rows;
  }
  return rows.filter((row) => label(row).toLowerCase().includes(needle));
}

type CatalogSelectProps = {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  side?: ReactNode;
  value: string;
  displayValue?: string;
  placeholder: string;
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
  disabled?: boolean;
  emptyMessage: string;
  optionLabels?: string[];
  onCreate?: (name: string) => Promise<void>;
  children: ReactNode;
};

function CatalogSelect({
  id,
  label,
  required = false,
  hint,
  side,
  value,
  displayValue,
  placeholder,
  search,
  onSearch,
  searchPlaceholder,
  open,
  onOpenChange,
  onChange,
  disabled = false,
  emptyMessage,
  optionLabels = [],
  onCreate,
  children,
}: CatalogSelectProps) {
  const [isCreating, setIsCreating] = useState(false);
  const createName = onCreate ? nameToCreate(search, optionLabels) : null;

  async function handleCreate() {
    if (!onCreate || !createName || isCreating) {
      return;
    }
    setIsCreating(true);
    try {
      await onCreate(createName);
      onSearch("");
      onOpenChange(false);
    } catch {
      // The caller reports the failure.
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          {label} {required ? <RequiredFieldMarker /> : null}
        </label>
        {side}
      </div>
      <SearchableSelect
        id={id}
        value={value || undefined}
        onValueChange={(next) => {
          if (next) {
            onChange(next);
          }
        }}
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          if (!next) {
            onSearch("");
          }
        }}
        disabled={disabled}
        searchValue={search}
        onSearchChange={onSearch}
        searchPlaceholder={searchPlaceholder}
        placeholder={placeholder}
        displayValue={displayValue}
        minSearchLength={0}
        noResultsMessage={emptyMessage}
        contentClassName="z-[60]"
        footerExtra={
          createName ? (
            <button
              type="button"
              className="flex w-full items-center rounded-md px-2 py-2 text-left text-sm font-medium text-brand-primary hover:bg-brand-tint disabled:opacity-60"
              disabled={isCreating}
              onClick={() => void handleCreate()}
            >
              {isCreating ? "Creating…" : `Create “${createName}”`}
            </button>
          ) : null
        }
      >
        {children}
      </SearchableSelect>
      {hint ? <p className="text-xs text-dash-muted">{hint}</p> : null}
    </div>
  );
}
