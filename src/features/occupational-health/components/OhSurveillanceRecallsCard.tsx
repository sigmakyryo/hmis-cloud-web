"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants/routes";
import {
  acknowledgeSurvRecall,
  fetchSurvRecalls,
  runSurvRecalls,
  type OhSurvRecall,
} from "@/features/occupational-health/services/oh-ext.service";
import { useToast } from "@/providers/toast-provider";

const STAGE_LABEL: Record<OhSurvRecall["stage"], string> = {
  due_soon: "Due soon",
  overdue: "Overdue",
  overdue_30: "Overdue 30+ days",
};

/** Medical surveillance recall worklist: in-app recalls plus "send recalls now" (email / SMS). */
export function OhSurveillanceRecallsCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [within, setWithin] = useState("14");
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);

  const recalls = useQuery({
    queryKey: ["oh-surv-recalls", "open"],
    queryFn: () => fetchSurvRecalls({ channel: "in_app", open_only: true }),
  });

  const run = useMutation({
    mutationFn: () =>
      runSurvRecalls({
        within_days: Number(within) || 14,
        channels: [...(email ? (["email"] as const) : []), ...(sms ? (["sms"] as const) : [])],
      }),
    onSuccess: (r) => {
      toast({
        variant: "success",
        title: "Recalls processed",
        description: `${r.in_app} new in-app · ${r.sent} sent · ${r.skipped} not configured · ${r.failed} failed`,
      });
      void queryClient.invalidateQueries({ queryKey: ["oh-surv-recalls"] });
    },
    onError: (error) =>
      toast({ variant: "error", title: "Could not run recalls", description: error instanceof Error ? error.message : undefined }),
  });

  const ack = useMutation({
    mutationFn: (uuid: string) => acknowledgeSurvRecall(uuid),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["oh-surv-recalls"] }),
  });

  const rows = recalls.data ?? [];

  return (
    <section className="border-b border-dash-border px-4 py-3 md:px-6" data-testid="oh-surv-recalls">
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <h2 className="mr-auto flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <BellRing className="size-4" /> Surveillance recalls ({rows.length} open)
        </h2>
        <div className="space-y-1">
          <Label htmlFor="oh-recall-within" className="text-xs">
            Due within (days)
          </Label>
          <Input id="oh-recall-within" className="h-8 w-24" value={within} onChange={(e) => setWithin(e.target.value)} />
        </div>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} /> Email
        </label>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} /> SMS
        </label>
        <Button type="button" size="sm" disabled={run.isPending} onClick={() => run.mutate()}>
          Send recalls now
        </Button>
      </div>
      {recalls.isLoading ? (
        <p className="text-sm text-brand-muted">Loading recalls…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-brand-muted">No open recalls.</p>
      ) : (
        <ul className="divide-y divide-dash-border text-sm">
          {rows.slice(0, 50).map((row) => (
            <li key={row.uuid} className="flex flex-wrap items-center gap-3 py-2">
              <span className={row.stage === "due_soon" ? "text-amber-700" : "font-medium text-red-700"}>
                {STAGE_LABEL[row.stage] ?? row.stage}
              </span>
              <span className="text-brand-slate">
                {row.component_code ?? "Surveillance"} · {row.exam_type ?? "periodic"} · due {row.due_date ?? "—"}
              </span>
              {row.customer_uuid ? (
                <Link className="text-xs underline-offset-2 hover:underline" href={ROUTES.occupationalHealthEmployment(row.customer_uuid)}>
                  Open worker
                </Link>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-auto h-7 gap-1 text-xs"
                disabled={ack.isPending}
                onClick={() => ack.mutate(row.uuid)}
              >
                <Check className="size-3" /> Done
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
