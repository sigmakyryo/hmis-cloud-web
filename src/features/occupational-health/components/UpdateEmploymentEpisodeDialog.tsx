"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchOhEmployerDepartments,
  fetchOhEmployerSites,
  fetchOhEmployers,
  fetchOhHazardProfiles,
  fetchOhJobTitles,
  updateEmploymentEpisode,
} from "@/features/occupational-health/services/oh.service";
import type {
  EmploymentEpisode,
  OhEmployer,
  OhEmployerDepartment,
  OhEmployerSite,
  OhHazardProfile,
  OhJobTitle,
} from "@/features/occupational-health/types";
import type { Customer } from "@/features/customers/types/customer.types";
import { useToast } from "@/providers/toast-provider";

type UpdateEmploymentEpisodeDialogProps = {
  customer: Customer;
  episode: EmploymentEpisode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
};

export function UpdateEmploymentEpisodeDialog({
  customer,
  episode,
  open,
  onOpenChange,
  onUpdated,
}: UpdateEmploymentEpisodeDialogProps) {
  const { toast } = useToast();
  const [employers, setEmployers] = useState<OhEmployer[]>([]);
  const [jobTitles, setJobTitles] = useState<OhJobTitle[]>([]);
  const [sites, setSites] = useState<OhEmployerSite[]>([]);
  const [departments, setDepartments] = useState<OhEmployerDepartment[]>([]);
  const [hazardProfiles, setHazardProfiles] = useState<OhHazardProfile[]>([]);
  const [employerId, setEmployerId] = useState(String(episode.employer));
  const [jobTitleId, setJobTitleId] = useState(String(episode.job_title));
  const [siteId, setSiteId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [hazardProfileId, setHazardProfileId] = useState(
    episode.hazard_profile ? String(episode.hazard_profile) : "",
  );
  const [startDate, setStartDate] = useState(episode.start_date);
  const [endDate, setEndDate] = useState(episode.end_date ?? "");
  const [employeeNumber, setEmployeeNumber] = useState(
    episode.employee_number ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const loadedEmployerIdRef = useRef<string | null>(null);
  const seededFromEpisodeRef = useRef(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setEmployerId(String(episode.employer));
    setJobTitleId(String(episode.job_title));
    setHazardProfileId(
      episode.hazard_profile ? String(episode.hazard_profile) : "",
    );
    setStartDate(episode.start_date);
    setEndDate(episode.end_date ?? "");
    setEmployeeNumber(episode.employee_number ?? "");
    setSiteId("");
    setDepartmentId("");
    loadedEmployerIdRef.current = null;
    seededFromEpisodeRef.current = false;
    void fetchOhEmployers().then(setEmployers);
  }, [episode, open]);

  useEffect(() => {
    if (!open || !employerId) {
      return;
    }
    if (loadedEmployerIdRef.current === employerId) {
      return;
    }
    const employerPk = Number(employerId);
    const shouldSeedFromEpisode =
      !seededFromEpisodeRef.current && employerPk === episode.employer;
    let cancelled = false;
    void Promise.all([
      fetchOhJobTitles(employerPk),
      fetchOhEmployerSites(employerPk),
      fetchOhEmployerDepartments(employerPk),
      fetchOhHazardProfiles(employerPk),
    ]).then(([jobRows, siteRows, departmentRows, hazardRows]) => {
      if (cancelled) {
        return;
      }
      loadedEmployerIdRef.current = employerId;
      setJobTitles(jobRows);
      setSites(siteRows);
      setDepartments(departmentRows);
      setHazardProfiles(hazardRows);

      if (shouldSeedFromEpisode) {
        const matchedSite = siteRows.find((row) => row.name === episode.site);
        const matchedDepartment = departmentRows.find(
          (row) => row.name === episode.department_name,
        );
        setJobTitleId(
          jobRows.some((row) => row.id === episode.job_title)
            ? String(episode.job_title)
            : jobRows[0]
              ? String(jobRows[0].id)
              : "",
        );
        setSiteId(matchedSite ? String(matchedSite.id) : "");
        setDepartmentId(matchedDepartment ? String(matchedDepartment.id) : "");
        setHazardProfileId(
          episode.hazard_profile &&
            hazardRows.some((row) => row.id === episode.hazard_profile)
            ? String(episode.hazard_profile)
            : "",
        );
        seededFromEpisodeRef.current = true;
        return;
      }

      seededFromEpisodeRef.current = true;
      setJobTitleId(jobRows[0] ? String(jobRows[0].id) : "");
      setSiteId("");
      setDepartmentId("");
      setHazardProfileId("");
    });

    return () => {
      cancelled = true;
    };
  }, [employerId, episode, open]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!employerId || !jobTitleId) {
      return;
    }
    setIsSubmitting(true);
    try {
      const selectedSite = sites.find((row) => String(row.id) === siteId);
      const selectedDepartment = departments.find(
        (row) => String(row.id) === departmentId,
      );
      await updateEmploymentEpisode(episode.uuid, {
        customer: customer.id,
        employer: Number(employerId),
        job_title: Number(jobTitleId),
        hazard_profile: hazardProfileId ? Number(hazardProfileId) : null,
        start_date: startDate,
        end_date: endDate || null,
        site: selectedSite?.name ?? "",
        department_name: selectedDepartment?.name ?? "",
        employee_number: employeeNumber,
        employment_type: episode.employment_type || "employee",
      });
      toast({ variant: "success", title: "Employment episode updated" });
      onOpenChange(false);
      onUpdated();
    } catch (error) {
      toast({
        title: "Could not update employment episode",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update employment episode</DialogTitle>
        </DialogHeader>
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="oh-update-employer">Employer</Label>
            <Select value={employerId} onValueChange={setEmployerId}>
              <SelectTrigger id="oh-update-employer">
                <SelectValue placeholder="Select employer" />
              </SelectTrigger>
              <SelectContent>
                {employers.map((employer) => (
                  <SelectItem key={employer.uuid} value={String(employer.id)}>
                    {employer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="oh-update-job-title">Job title</Label>
            <Select value={jobTitleId} onValueChange={setJobTitleId}>
              <SelectTrigger id="oh-update-job-title">
                <SelectValue placeholder="Select job title" />
              </SelectTrigger>
              <SelectContent>
                {jobTitles.map((job) => (
                  <SelectItem key={job.uuid} value={String(job.id)}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="oh-update-department">Department (optional)</Label>
            <Select
              value={departmentId || "none"}
              onValueChange={(value) =>
                setDepartmentId(value === "none" ? "" : value)
              }
            >
              <SelectTrigger id="oh-update-department">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No department</SelectItem>
                {departments.map((row) => (
                  <SelectItem key={row.uuid} value={String(row.id)}>
                    {row.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="oh-update-site">Site (optional)</Label>
            <Select
              value={siteId || "none"}
              onValueChange={(value) => setSiteId(value === "none" ? "" : value)}
            >
              <SelectTrigger id="oh-update-site">
                <SelectValue placeholder="Select site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No site</SelectItem>
                {sites.map((row) => (
                  <SelectItem key={row.uuid} value={String(row.id)}>
                    {row.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="oh-update-risk-profile">Risk profile (optional)</Label>
            <Select
              value={hazardProfileId || "none"}
              onValueChange={(value) =>
                setHazardProfileId(value === "none" ? "" : value)
              }
            >
              <SelectTrigger id="oh-update-risk-profile">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {hazardProfiles.map((profile) => (
                  <SelectItem key={profile.uuid} value={String(profile.id)}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="oh-update-start-date">Start date</Label>
              <Input
                id="oh-update-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oh-update-end-date">End date</Label>
              <Input
                id="oh-update-end-date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="oh-update-employee-number">Employee number</Label>
            <Input
              id="oh-update-employee-number"
              value={employeeNumber}
              onChange={(event) => setEmployeeNumber(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || !jobTitleId}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
