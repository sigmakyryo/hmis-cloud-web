"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import {
  ListPageDataTable,
  ListPageDataTableBody,
  ListPageDataTableCell,
  ListPageDataTableHeader,
  ListPageDataTableHeaderCell,
  ListPageDataTableHeaderRow,
  ListPageDataTableRow,
} from "@/features/app-shell/components/page-layout";
import { OhConfirmDialog } from "@/features/occupational-health/components/dashboard/OhConfirmDialog";
import { OhPanel, OhPanelState } from "@/features/occupational-health/components/dashboard/OhPanel";
import { OH_STICKY_TABLE } from "@/features/occupational-health/components/dashboard/oh-flat";
import { OhSegmented } from "@/features/occupational-health/components/dashboard/OhSegmented";
import { OhSendRecallDialog } from "@/features/occupational-health/components/surveillance/OhSendRecallDialog";
import { examTypeLabel, formatDate } from "@/features/occupational-health/components/surveillance/oh-surveillance-utils";
import {
  acknowledgeSurvRecall,
  fetchSurvRecalls,
  type OhSurvRecall,
} from "@/features/occupational-health/services/oh-ext.service";
import { useToast } from "@/providers/toast-provider";

const STAGE: Record<OhSurvRecall["stage"], { label: string; variant: "warning" | "destructive" }> = {
  due_soon: { label: "Due soon", variant: "warning" },
  overdue: { label: "Overdue", variant: "destructive" },
  overdue_30: { label: "Overdue 30+ days", variant: "destructive" },
};

type StageFilter = "all" | OhSurvRecall["stage"];

/** Medical surveillance recall worklist: open in-app recalls, mark done, and send recalls (with confirmation). */
/** Open in-app recalls by stage. `tabs` lets the page put its view switcher in the section header. */
export function OhSurveillanceRecallsCard({ tabs }: { tabs?: ReactNode } = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<StageFilter>("all");
  const [sendOpen, setSendOpen] = useState(false);
  const [confirmRow, setConfirmRow] = useState<OhSurvRecall | null>(null);

  const recalls = useQuery({
    queryKey: ["oh-surv-recalls", "open"],
    queryFn: () => fetchSurvRecalls({ channel: "in_app", open_only: true }),
  });

  const ack = useMutation({
    mutationFn: (uuid: string) => acknowledgeSurvRecall(uuid),
    onSuccess: () => {
      toast({ variant: "success", title: "Recall marked done" });
      setConfirmRow(null);
      void queryClient.invalidateQueries({ queryKey: ["oh-surv-recalls"] });
    },
    onError: (error) =>
      toast({ variant: "error", title: "Could not update the recall", description: error instanceof Error ? error.message : undefined }),
  });

  const rows = useMemo(() => recalls.data ?? [], [recalls.data]);
  const counts = useMemo(
    () => ({
      due_soon: rows.filter((r) => r.stage === "due_soon").length,
      overdue: rows.filter((r) => r.stage === "overdue").length,
      overdue_30: rows.filter((r) => r.stage === "overdue_30").length,
    }),
    [rows],
  );
  const visible = stage === "all" ? rows : rows.filter((r) => r.stage === stage);

  return (
    <OhPanel
      title="Recalls"
      description={`${rows.length} open in-app recall${rows.length === 1 ? "" : "s"}. Mark one done once the worker is booked or seen.`}
      actions={
        <>
          {tabs}
          <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setSendOpen(true)}>
            <BellRing className="size-3.5" aria-hidden /> Send recalls…
          </Button>
        </>
      }
      data-testid="oh-surv-recalls"
    >
      <div className="pb-3">
        <OhSegmented
          label="Recall stage"
          value={stage}
          onChange={setStage}
          options={[
            { value: "all", label: "All", count: rows.length },
            { value: "due_soon", label: "Due soon", count: counts.due_soon },
            { value: "overdue", label: "Overdue", count: counts.overdue },
            { value: "overdue_30", label: "30+ days", count: counts.overdue_30 },
          ]}
        />
      </div>
      <div>
        <OhPanelState
          isLoading={recalls.isLoading}
          error={recalls.error}
          onRetry={() => void recalls.refetch()}
          isEmpty={visible.length === 0}
          emptyText={rows.length === 0 ? "No open recalls. Send recalls to remind workers who are due." : "No recalls at this stage."}
          height={160}
        >
          <ListPageDataTable className={OH_STICKY_TABLE}>
            <ListPageDataTableHeader>
              <ListPageDataTableHeaderRow>
                <ListPageDataTableHeaderCell>Stage</ListPageDataTableHeaderCell>
                <ListPageDataTableHeaderCell>Exam</ListPageDataTableHeaderCell>
                <ListPageDataTableHeaderCell>Due</ListPageDataTableHeaderCell>
                <ListPageDataTableHeaderCell>Worker</ListPageDataTableHeaderCell>
                <ListPageDataTableHeaderCell className="text-right">Action</ListPageDataTableHeaderCell>
              </ListPageDataTableHeaderRow>
            </ListPageDataTableHeader>
            <ListPageDataTableBody>
              {visible.slice(0, 100).map((row) => (
                <ListPageDataTableRow key={row.uuid}>
                  <ListPageDataTableCell>
                    <Badge variant={STAGE[row.stage]?.variant ?? "outline"}>{STAGE[row.stage]?.label ?? row.stage}</Badge>
                  </ListPageDataTableCell>
                  <ListPageDataTableCell>
                    <span className="font-medium text-brand-navy">{row.component_code ?? "Surveillance"}</span>
                    <span className="text-dash-muted"> · {examTypeLabel(row.exam_type)}</span>
                  </ListPageDataTableCell>
                  <ListPageDataTableCell className="whitespace-nowrap tabular-nums">{formatDate(row.due_date)}</ListPageDataTableCell>
                  <ListPageDataTableCell>
                    {row.customer_uuid ? (
                      <Link
                        className="inline-flex items-center gap-1 text-brand-primary underline-offset-2 hover:underline"
                        href={ROUTES.occupationalHealthEmployment(row.customer_uuid)}
                      >
                        Open worker <ExternalLink className="size-3" aria-hidden />
                      </Link>
                    ) : (
                      "—"
                    )}
                  </ListPageDataTableCell>
                  <ListPageDataTableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      aria-label={`Mark ${row.component_code ?? "recall"} recall done`}
                      onClick={() => setConfirmRow(row)}
                    >
                      <Check className="size-3" aria-hidden /> Mark done
                    </Button>
                  </ListPageDataTableCell>
                </ListPageDataTableRow>
              ))}
            </ListPageDataTableBody>
          </ListPageDataTable>
        </OhPanelState>
      </div>

      <OhSendRecallDialog open={sendOpen} onOpenChange={setSendOpen} />
      <OhConfirmDialog
        open={confirmRow !== null}
        onOpenChange={(open) => (!open ? setConfirmRow(null) : undefined)}
        title="Mark recall done?"
        description={
          confirmRow
            ? `${confirmRow.component_code ?? "Surveillance"} recall, due ${formatDate(confirmRow.due_date)}. It leaves the open list; the requirement itself stays until an exam completes it.`
            : undefined
        }
        confirmLabel="Mark done"
        isPending={ack.isPending}
        onConfirm={() => confirmRow && ack.mutate(confirmRow.uuid)}
        data-testid="oh-recall-done-dialog"
      />
    </OhPanel>
  );
}
