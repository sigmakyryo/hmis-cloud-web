"use client";

import { useQuery } from "@tanstack/react-query";
import { UserGroupIcon } from "@hugeicons/core-free-icons";
import { useState } from "react";

import {
  PortalCell,
  PortalFootnote,
  PortalPage,
  PortalPageHeader,
  PortalPerson,
  PortalPill,
  PortalRow,
  PortalSearch,
  PortalStatStrip,
  PortalStatusPill,
  PortalTable,
  PortalToolbar,
} from "@/features/employer-portal/components/PortalPrimitives";
import {
  PORTAL_SCOPE_LABEL,
  fetchPortalEmployees,
  fetchPortalUsers,
  type PortalEmployeeStatus,
} from "@/features/employer-portal/services/employer-portal.service";

import { PortalState } from "./PortalShell";
import { fmtDate } from "./portal-ui";

type Section = "employees" | "logins";
type StatusFilter = "" | PortalEmployeeStatus;

export function PortalEmployeesPage() {
  const [section, setSection] = useState<Section>("employees");

  return (
    <PortalPage testId="employer-portal-employees">
      <PortalPageHeader icon={UserGroupIcon} title="Employees" subtitle="The people who work for your company" />
      <PortalToolbar>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Employees sections">
          <PortalPill active={section === "employees"} onClick={() => setSection("employees")}>
            Employees
          </PortalPill>
          <PortalPill active={section === "logins"} onClick={() => setSection("logins")}>
            Portal logins
          </PortalPill>
        </div>
      </PortalToolbar>
      {section === "employees" ? <EmployeesList /> : <PortalLogins />}
    </PortalPage>
  );
}

function EmployeesList() {
  const [status, setStatus] = useState<StatusFilter>("");
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["employer-portal", "employees", status, search],
    queryFn: () => fetchPortalEmployees(status || undefined, search || undefined),
    retry: false,
  });
  const counts = query.data?.counts;
  const rows = query.data?.results ?? [];

  return (
    <>
      <PortalStatStrip
        loading={query.isLoading}
        stats={[
          { label: "Employees", value: String(counts?.all ?? 0) },
          { label: "Currently employed", value: String(counts?.active ?? 0), tone: "good" },
          { label: "Former", value: String(counts?.former ?? 0) },
        ]}
      />
      <PortalToolbar>
        <PortalSearch label="Search employees" placeholder="Search name, number, site or department" value={search} onChange={setSearch} />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Employment status">
          <PortalPill active={status === ""} count={counts?.all} onClick={() => setStatus("")}>
            Everyone
          </PortalPill>
          <PortalPill active={status === "active"} count={counts?.active} onClick={() => setStatus("active")}>
            Employed
          </PortalPill>
          <PortalPill active={status === "former"} count={counts?.former} onClick={() => setStatus("former")}>
            Former
          </PortalPill>
        </div>
      </PortalToolbar>
      <PortalState
        loading={query.isLoading}
        error={query.error}
        empty={query.isSuccess && rows.length === 0 ? "No employees match this view." : null}
        emptyIcon={UserGroupIcon}
        emptyTitle="No employees to show"
      >
        <PortalTable columns={["Employee", "Site", "Department", "Type", "Started", "Status"]}>
          {rows.map((employee) => (
            <PortalRow key={employee.customer_uuid ?? `${employee.worker}-${employee.employee_number}`} testId="employer-portal-employee">
              <PortalCell>
                <PortalPerson title={employee.worker || "Unnamed"} detail={employee.employee_number || undefined} />
              </PortalCell>
              <PortalCell>{employee.site || "—"}</PortalCell>
              <PortalCell>{employee.department || "—"}</PortalCell>
              <PortalCell>{employee.employment_type || "—"}</PortalCell>
              <PortalCell className="whitespace-nowrap">{employee.start_date ? fmtDate(employee.start_date) : "—"}</PortalCell>
              <PortalCell>
                <PortalStatusPill tone={employee.status === "active" ? "good" : "neutral"}>{employee.status === "active" ? "Employed" : "Former"}</PortalStatusPill>
              </PortalCell>
            </PortalRow>
          ))}
        </PortalTable>
      </PortalState>
      <PortalFootnote>Names and where people work only. Health and contact details stay with the clinic.</PortalFootnote>
    </>
  );
}

function PortalLogins() {
  const query = useQuery({ queryKey: ["employer-portal", "users"], queryFn: fetchPortalUsers, retry: false });
  const rows = query.data ?? [];

  return (
    <>
      <PortalState loading={query.isLoading} error={query.error} empty={query.isSuccess && rows.length === 0 ? "No other users." : null} emptyIcon={UserGroupIcon} emptyTitle="Just you for now">
        <PortalTable columns={["Person", "Can see"]}>
          {rows.map((u) => (
            <PortalRow key={u.email} testId="employer-portal-user">
              <PortalCell>
                <PortalPerson title={u.name || u.email} detail={u.name ? u.email : undefined} />
              </PortalCell>
              <PortalCell>{u.scopes.map((s) => PORTAL_SCOPE_LABEL[s] ?? s).join(", ")}</PortalCell>
            </PortalRow>
          ))}
        </PortalTable>
      </PortalState>
      <PortalFootnote>To add or remove a person who can sign in, contact the clinic.</PortalFootnote>
    </>
  );
}
