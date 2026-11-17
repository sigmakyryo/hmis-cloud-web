"use client";

import { useQueries } from "@tanstack/react-query";
import { File02Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";

import { AnnualDashboard } from "@/features/employer-portal/annual/AnnualDashboard";
import { PortalPage, PortalPageHeader } from "@/features/employer-portal/components/PortalPrimitives";
import { fetchPortalAnnualSummary, portalAnnualFileUrl } from "@/features/occupational-health/services/oh-annual-report.service";

import { PortalState, usePortalMe } from "./PortalShell";

/** The chosen year and the three before it: the trend and the year-on-year comparison come from these. */
const TREND_YEARS = 4;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const DEFAULT_ACCENT = "#2f55e8";

const linkClass = "inline-flex h-10 items-center rounded-xl border border-neutral-200 bg-white px-3.5 text-[14px] text-neutral-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-neutral-50";

export function PortalAnnualSummaryPage() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear - 1);
  const me = usePortalMe();
  const accentColor = me?.branding?.accent_color;
  const accent = accentColor && HEX_COLOR.test(accentColor) ? accentColor : DEFAULT_ACCENT;
  const years = Array.from({ length: 6 }, (_, i) => thisYear - i);
  const yearsInView = Array.from({ length: TREND_YEARS }, (_, i) => year - (TREND_YEARS - 1) + i);

  const queries = useQueries({
    queries: yearsInView.map((y) => ({
      queryKey: ["employer-portal", "annual", y],
      queryFn: () => fetchPortalAnnualSummary(y),
      retry: false,
    })),
  });
  const selected = queries[queries.length - 1];
  const series = yearsInView.map((y, index) => ({ year: y, report: queries[index]?.data ?? null }));

  return (
    <PortalPage testId="employer-portal-annual">
      <PortalPageHeader
        icon={File02Icon}
        title="Annual summary"
        subtitle="Your company's occupational health year at a glance"
        actions={
          <>
            <select aria-label="Year" className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-[14px] text-neutral-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)]" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <a className={linkClass} href={portalAnnualFileUrl(year, "pdf")} target="_blank" rel="noreferrer">
              PDF
            </a>
            <a className={linkClass} href={portalAnnualFileUrl(year, "csv")}>
              CSV
            </a>
          </>
        }
      />
      <PortalState loading={selected?.isLoading} error={selected?.error}>
        {selected?.data ? <AnnualDashboard series={series} year={year} accent={accent} suppression={selected.data.suppression} /> : null}
      </PortalState>
    </PortalPage>
  );
}
