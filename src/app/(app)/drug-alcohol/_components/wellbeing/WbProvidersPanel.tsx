"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { CheckField, Field, SelectField } from "@/app/(app)/immunizations/_components/shared/Field";
import { ImmPrimaryCell, ImmRecordTable, ImmRowAction, ImmStatusBadge } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import {
  WB_PROVIDER_KIND_LABEL,
  createWbProvider,
  fetchWbProviders,
  updateWbProvider,
  type WbProvider,
} from "@/features/occupational-health/services/wellbeing.service";
import { useToast } from "@/providers/toast-provider";
import { errorText, label } from "../shared/da-format";
import { DaCell, DaRow } from "../shared/da-ui";

export function WbProvidersPanel() {
  const [editing, setEditing] = useState<WbProvider | "new" | null>(null);
  const query = useQuery({ queryKey: ["oh-wb", "providers"], queryFn: fetchWbProviders });
  const rows = query.data ?? [];
  return (
    <>
      <div className="flex justify-end px-4 py-2 md:px-6">
        <PageActionButton onClick={() => setEditing("new")}>Add provider</PageActionButton>
      </div>
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error, "Could not load providers.")}</LoadError> : null}
      {query.isSuccess && rows.length === 0 ? (
        <EmptyAction icon="heartPulse" title="No providers yet" description="Add your employee assistance programme, counsellors or treatment centres." />
      ) : null}
      {query.isSuccess && rows.length > 0 ? (
        <ImmRecordTable columns={["Provider", "Type", "Contact", "Sessions included", "Status", "Actions"]}>
          {rows.map((p) => (
            <DaRow key={p.uuid} testId="oh-wb-provider-row">
              <DaCell first>
                <ImmPrimaryCell title={p.name} detail={p.contact_name} />
              </DaCell>
              <DaCell>{label(WB_PROVIDER_KIND_LABEL, p.kind)}</DaCell>
              <DaCell>{[p.phone, p.email].filter(Boolean).join(" · ") || "—"}</DaCell>
              <DaCell>{p.sessions_included ?? "—"}</DaCell>
              <DaCell>
                <ImmStatusBadge status={p.active ? "open" : "closed"} label={p.active ? "In use" : "Not in use"} />
              </DaCell>
              <DaCell actions>
                <ImmRowAction onClick={() => setEditing(p)}>Edit</ImmRowAction>
              </DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      ) : null}
      {editing ? <ProviderDrawer provider={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

function ProviderDrawer({ provider, onClose }: { provider: WbProvider | null; onClose: () => void }) {
  const { toast } = useToast();
  const client = useQueryClient();
  const [form, setForm] = useState({
    name: provider?.name ?? "",
    kind: provider?.kind ?? "eap",
    contact_name: provider?.contact_name ?? "",
    phone: provider?.phone ?? "",
    email: provider?.email ?? "",
    website: provider?.website ?? "",
    referral_instructions: provider?.referral_instructions ?? "",
    sessions_included: provider?.sessions_included != null ? String(provider.sessions_included) : "",
    active: provider?.active ?? true,
  });
  const set = (key: keyof typeof form) => (value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));
  const save = useMutation({
    mutationFn: () => {
      const body: Partial<WbProvider> = {
        ...form,
        kind: form.kind as WbProvider["kind"],
        sessions_included: form.sessions_included ? Number(form.sessions_included) : null,
      };
      if (!form.email) delete body.email;
      if (!form.website) delete body.website;
      return provider ? updateWbProvider(provider.uuid, body) : createWbProvider(body);
    },
    onSuccess: () => {
      toast({ variant: "success", title: "Provider saved" });
      void client.invalidateQueries({ queryKey: ["oh-wb", "providers"] });
      onClose();
    },
    onError: (error) => toast({ variant: "error", title: "Not saved", description: errorText(error) }),
  });
  return (
    <Drawer title={provider ? `Edit ${provider.name}` : "Add provider"} onClose={onClose}>
      <div className="space-y-3" data-testid="oh-wb-provider-form">
        <Field label="Name" required value={form.name} onChange={set("name")} />
        <SelectField label="Type" value={form.kind} onChange={set("kind")}>
          {Object.entries(WB_PROVIDER_KIND_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </SelectField>
        <Field label="Contact person" value={form.contact_name} onChange={set("contact_name")} />
        <Field label="Phone" value={form.phone} onChange={set("phone")} />
        <Field label="Email" value={form.email} onChange={set("email")} />
        <Field label="Website" value={form.website} onChange={set("website")} />
        <Field label="How to refer" value={form.referral_instructions} onChange={set("referral_instructions")} />
        <Field label="Sessions included" type="number" value={form.sessions_included} onChange={set("sessions_included")} />
        <CheckField label="In use" checked={form.active} onChange={set("active")} />
        <DrawerActions>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PageActionButton disabled={!form.name.trim() || save.isPending} onClick={() => save.mutate()}>
            Save
          </PageActionButton>
        </DrawerActions>
      </div>
    </Drawer>
  );
}
