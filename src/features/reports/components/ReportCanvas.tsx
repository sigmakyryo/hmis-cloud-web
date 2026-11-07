"use client";

import { useEffect, useRef, useState } from "react";
import type { ECharts } from "echarts/core";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportFilterBar } from "@/features/reports/components/ReportFilterBar";
import { ReportVisualCharts } from "@/features/reports/components/ReportVisualCharts";
import type { ReportCatalogItem } from "@/features/reports/constants/report-catalog";
import { useReportExport } from "@/features/reports/providers/report-export-provider";
import { loadReportVisual } from "@/features/reports/services/report-visuals.service";
import type { ReportVisual } from "@/features/reports/types/report-visual.types";
import {
  describeReportPeriod,
  initialReportFilterValues,
} from "@/features/reports/utils/report-visual-range";

type ReportCanvasProps = {
  report: ReportCatalogItem;
};

function kpiColumnClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-2";
  if (count === 3) return "grid-cols-3";
  return "grid-cols-4";
}

export function ReportCanvas({ report }: ReportCanvasProps) {
  const { startCsvExport, isSubmitting } = useReportExport();
  const [filterValues, setFilterValues] = useState(() =>
    initialReportFilterValues(report),
  );
  const [visual, setVisual] = useState<ReportVisual | null>(null);
  const [loadKey, setLoadKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const chartsRef = useRef(new Map<string, ECharts>());
  const requestKey = `${report.id}:${JSON.stringify(filterValues)}`;
  const isCurrentError = errorKey === requestKey && errorMessage !== null;
  const isLoading = loadKey !== requestKey && !isCurrentError;

  useEffect(() => {
    chartsRef.current.clear();
  }, [requestKey]);

  useEffect(() => {
    let cancelled = false;
    const key = requestKey;

    async function load() {
      await Promise.resolve();
      if (cancelled) {
        return;
      }
      try {
        const next = await loadReportVisual(report, filterValues);
        if (!cancelled) {
          setVisual(next);
          setLoadKey(key);
          setErrorMessage(null);
          setErrorKey(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "Could not load this report.",
          );
          setErrorKey(key);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [filterValues, report, requestKey]);

  async function exportPdf() {
    if (!visual) {
      return;
    }
    setIsExportingPdf(true);
    setPdfError(null);
    try {
      const images = visual.charts.flatMap((chart) => {
        const instance = chartsRef.current.get(chart.id);
        if (!instance) {
          return [];
        }
        return [
          {
            title: chart.title,
            dataUrl: instance.getDataURL({
              type: "png",
              pixelRatio: 2,
              backgroundColor: "#ffffff",
            }),
          },
        ];
      });
      const { downloadReportPdf } = await import(
        "@/features/reports/utils/export-report-pdf"
      );
      await downloadReportPdf({
        title: report.title,
        description: report.description,
        periodLabel: describeReportPeriod(filterValues),
        kpis: visual.kpis,
        charts: visual.charts,
        images,
      });
    } catch (error) {
      setPdfError(
        error instanceof Error ? error.message : "Could not export the PDF.",
      );
    } finally {
      setIsExportingPdf(false);
    }
  }

  return (
    <div className="min-w-0" data-testid="report-canvas">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-dash-border bg-white px-8 py-3.5">
        <h2 className="shrink-0 text-[15px] font-semibold tracking-tight text-brand-navy">
          {report.title}
        </h2>
        <ReportFilterBar
          report={report}
          values={filterValues}
          onChange={(name, value) =>
            setFilterValues((current) => ({ ...current, [name]: value }))
          }
        />
        <div className="ml-auto flex shrink-0 items-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 text-brand-slate"
            disabled={isSubmitting}
            data-testid="report-export-csv"
            onClick={() => void startCsvExport(report.id, filterValues)}
          >
            {isSubmitting ? "Exporting CSV…" : "Export CSV"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 text-brand-navy"
            disabled={isLoading || !visual || isExportingPdf}
            data-testid="report-export-pdf"
            onClick={() => void exportPdf()}
          >
            {isExportingPdf ? "Exporting PDF…" : "Export PDF"}
          </Button>
        </div>
      </div>

      <div className="px-8 pb-16">
        {pdfError ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {pdfError}
          </p>
        ) : null}

        {isCurrentError ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {isLoading ? (
          <div className="space-y-8 pt-8" data-testid="report-visual-loading">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        ) : visual ? (
          <div>
            {visual.kpis.length > 0 ? (
              <dl
                className={`grid gap-px bg-dash-border ${kpiColumnClass(visual.kpis.length)}`}
              >
                {visual.kpis.map((kpi) => (
                  <div key={kpi.label} className="bg-white py-7 pr-6">
                    <dt className="text-xs text-brand-muted">{kpi.label}</dt>
                    <dd className="mt-2 text-2xl font-semibold leading-none tracking-tight text-brand-navy tabular-nums">
                      {kpi.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <div className="pt-10">
              <ReportVisualCharts
                charts={visual.charts}
                onChartReady={(chartId, chart) => {
                  chartsRef.current.set(chartId, chart);
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
