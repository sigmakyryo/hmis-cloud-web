"use client";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cancellationReportCsvUrl,
  fetchCancellationReport,
} from "@/features/occupational-health/services/oh-ext.service";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Cancelled and did-not-attend visits by reason and month, with a CSV download. */
export function OhVisitCancellationsReport() {
  const [from, setFrom] = useState(() => isoDaysAgo(90));
  const [to, setTo] = useState(() => isoDaysAgo(0));
  const report = useQuery({
    queryKey: ["oh-cancellation-report", from, to],
    queryFn: () => fetchCancellationReport({ from, to }),
  });
  const r = report.data;

  return (
    <section className="space-y-3 border-t border-dash-border px-4 py-4 md:px-6" data-testid="oh-cancellations-report">
      <div className="flex flex-wrap items-end gap-3">
        <h2 className="mr-auto text-sm font-semibold text-brand-navy">Cancellations and no-shows</h2>
        <div className="space-y-1">
          <Label htmlFor="oh-cancel-from" className="text-xs">
            From
          </Label>
          <Input id="oh-cancel-from" type="date" className="h-8" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="oh-cancel-to" className="text-xs">
            To
          </Label>
          <Input id="oh-cancel-to" type="date" className="h-8" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button asChild size="sm" variant="outline" className="gap-1">
          <a href={cancellationReportCsvUrl({ from, to })}>
            <Download className="size-3.5" /> CSV
          </a>
        </Button>
      </div>
      {report.isLoading ? <p className="text-sm text-brand-muted">Loading…</p> : null}
      {r ? (
        <div className="grid gap-4 text-sm md:grid-cols-3">
          <div>
            <p>
              <strong>{r.cancelled}</strong> cancelled · <strong>{r.no_show}</strong> did not attend
            </p>
            <p className="text-xs text-brand-muted">
              of {r.total_visits} visits
              {r.no_show_rate !== null ? ` · no-show rate ${(r.no_show_rate * 100).toFixed(1)}%` : ""}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-brand-muted">By reason</p>
            <ul>
              {r.by_reason.map((x) => (
                <li key={x.code}>
                  {x.label}: {x.count}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-brand-muted">By month</p>
            <ul>
              {r.by_month.map((m) => (
                <li key={m.month}>
                  {m.month}: {m.cancelled} cancelled, {m.no_show} no-show
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
