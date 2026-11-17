"use client";

import { useQuery } from "@tanstack/react-query";
import { UserGroupIcon } from "@hugeicons/core-free-icons";
import { useState } from "react";

import { PortalPagination } from "@/features/employer-portal/components/PortalPagination";
import { usePortalPagination } from "@/features/employer-portal/hooks/usePortalPagination";
import {
  PortalCell,
  PortalFootnote,
  PortalPage,
  PortalPageHeader,
  PortalPerson,
  PortalRow,
  PortalSearch,
  PortalStatStrip,
  PortalStatusPill,
  PortalTable,
  PortalToolbar,
} from "@/features/employer-portal/components/PortalPrimitives";
import { fetchPortalEmployees } from "@/features/employer-portal/services/employer-portal.service";

import { PortalState } from "./PortalShell";
import { fmtDate } from "./portal-ui";

export function PortalEmployeesPage() {
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["employer-portal", "employees", search],
    queryFn: () => fetchPortalEmployees(undefined, search || undefined),
    retry: false,
  });
  const counts = query.data?.counts;
  const rows = query.data?.results ?? [];
  const { pageRows, pagination } = usePortalPagination(rows, search);

  return (
    <PortalPage testId="employer-portal-employees">
      <PortalPageHeader icon={UserGroupIcon} title="Employees" subtitle="The people who work for your company" />
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
      </PortalToolbar>
      <PortalState
        loading={query.isLoading}
        error={query.error}
        empty={query.isSuccess && rows.length === 0 ? "No employees match this search." : null}
        emptyIcon={UserGroupIcon}
        emptyTitle="No employees to show"
      >
        <PortalTable columns={["Employee", "Site", "Department", "Type", "Started", "Status"]}>
          {pageRows.map((employee) => (
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
      <PortalPagination {...pagination} />
      <PortalFootnote>Names and where people work only. Health and contact details stay with the clinic.</PortalFootnote>
    </PortalPage>
  );
}
