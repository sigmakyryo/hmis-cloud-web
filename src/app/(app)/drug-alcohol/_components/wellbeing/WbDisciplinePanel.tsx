"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { ImmEmployeeLink } from "@/app/(app)/immunizations/_components/shared/ImmEmployeeLink";
import { Field, SelectField } from "@/app/(app)/immunizations/_components/shared/Field";
import { ImmRecordTable } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { WB_ACTION_LABEL, fetchWbDiscipline, recordWbDiscipline } from "@/features/occupational-health/services/wellbeing.service";
import { useToast } from "@/providers/toast-provider";
import { errorText, fmtDate, isForbidden, label } from "../shared/da-format";
import { DaCell, DaRow } from "../shared/da-ui";

/** Disciplinary outcomes: employer representative / admin only, kept apart from support. */
export function WbDisciplinePanel() {
  const [adding, setAdding] = useState(false);
  const query = useQuery({ queryKey: ["oh-wb", "discipline"], queryFn: () => fetchWbDiscipline(), retry: false });
  const rows = query.data ?? [];
  if (query.isError && isForbidden(query.error)) {
    return <LoadError>Only the employer representative or an administrator can see disciplinary outcomes.</LoadError>;
  }
  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 py-2 md:px-6">
        <p className="text-[12px] text-dash-muted">Kept separate from support. The wellbeing team cannot see these.</p>
        <PageActionButton onClick={() => setAdding(true)}>Record outcome</PageActionButton>
      </div>
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error, "Could not load disciplinary outcomes.")}</LoadError> : null}
      {query.isSuccess && rows.length === 0 ? <EmptyAction icon="clipboard" title="Nothing recorded" description="Disciplinary outcomes appear here." /> : null}
      {query.isSuccess && rows.length > 0 ? (
        <ImmRecordTable columns={["Person", "Outcome", "Decided", "Note", "By"]}>
          {rows.map((d) => (
            <DaRow key={d.uuid} testId="oh-wb-discipline-row">
              <DaCell first>
                <ImmEmployeeLink uuid={d.customer_uuid} />
              </DaCell>
              <DaCell>{label(WB_ACTION_LABEL, d.action)}</DaCell>
              <DaCell>{fmtDate(d.decided_on)}</DaCell>
              <DaCell>{d.note || "—"}</DaCell>
              <DaCell>{d.recorded_by_initials || "—"}</DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      ) : null}
      {adding ? <DisciplineDrawer onClose={() => setAdding(false)} /> : null}
    </>
  );
}

function DisciplineDrawer({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const client = useQueryClient();
  const [form, setForm] = useState({ customer_uuid: "", test_uuid: "", action: "none", decided_on: "", note: "" });
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const save = useMutation({
    mutationFn: () =>
      recordWbDiscipline({
        customer_uuid: form.customer_uuid.trim(),
        test_uuid: form.test_uuid.trim() || undefined,
        action: form.action,
        decided_on: form.decided_on || undefined,
        note: form.note || undefined,
      }),
    onSuccess: () => {
      toast({ variant: "success", title: "Recorded" });
      void client.invalidateQueries({ queryKey: ["oh-wb", "discipline"] });
      onClose();
    },
    onError: (error) => toast({ variant: "error", title: "Not recorded", description: errorText(error) }),
  });
  return (
    <Drawer title="Record a disciplinary outcome" onClose={onClose}>
      <div className="space-y-3" data-testid="oh-wb-discipline-form">
        <Field label="Employee ID" required value={form.customer_uuid} onChange={set("customer_uuid")} />
        <Field label="Test reference ID (optional)" value={form.test_uuid} onChange={set("test_uuid")} />
        <SelectField label="Outcome" value={form.action} onChange={set("action")}>
          {Object.entries(WB_ACTION_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </SelectField>
        <Field label="Decided on" type="date" value={form.decided_on} onChange={set("decided_on")} />
        <Field label="Note" value={form.note} onChange={set("note")} />
        <DrawerActions>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PageActionButton disabled={!form.customer_uuid.trim() || save.isPending} onClick={() => save.mutate()}>
            Save
          </PageActionButton>
        </DrawerActions>
      </div>
    </Drawer>
  );
}
