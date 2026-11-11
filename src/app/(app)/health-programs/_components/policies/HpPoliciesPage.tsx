"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { CheckField, Field } from "@/app/(app)/immunizations/_components/shared/Field";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import { ImmPrimaryCell, ImmRecordTable, ImmRowAction } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmNotice, ImmTabsBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { DaCell, DaRow } from "@/app/(app)/drug-alcohol/_components/shared/da-ui";
import { errorText } from "@/app/(app)/fitness/_components/shared/fit-format";
import {
  HP_PROGRAMS,
  fetchHpPolicies,
  publishHpPolicy,
  seedHpPolicies,
  seedHpReferencePolicies,
  type HpPolicy,
  type HpProgram,
} from "@/features/occupational-health/services/health-programs.service";
import { useToast } from "@/providers/toast-provider";
import { PROGRAM_LABEL } from "../shared/hp-format";

type Tab = "all" | HpProgram;
const csv = (list: string[] | undefined) => (list ?? []).join(", ");
const split = (text: string) => text.split(",").map((s) => s.trim()).filter(Boolean);

function PolicyDrawer({ policy, onClose }: { policy: HpPolicy; onClose: () => void }) {
  const { toast } = useToast();
  const client = useQueryClient();
  const s = policy.snapshot;
  const [freq, setFreq] = useState(String(s?.frequency_months ?? 12));
  const [all, setAll] = useState(Boolean(s?.assignment.all));
  const [roles, setRoles] = useState(csv(s?.assignment.roles));
  const [departments, setDepartments] = useState(csv(s?.assignment.departments));
  const [sites, setSites] = useState(csv(s?.assignment.sites));
  const [exposures, setExposures] = useState(csv(s?.assignment.exposures));
  const [product, setProduct] = useState(s?.billing?.product_uuid ?? "");
  const [thresholds, setThresholds] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(s?.thresholds ?? {}).map(([k, v]) => [k, String(v)])),
  );

  const publish = useMutation({
    mutationFn: () =>
      publishHpPolicy(policy.uuid, {
        frequency_months: Number(freq),
        assignment: { all, roles: split(roles), departments: split(departments), sites: split(sites), exposures: split(exposures).map((e) => e.toUpperCase()) },
        thresholds: Object.fromEntries(
          Object.entries(thresholds).map(([k, v]) => [k, v === "true" ? true : v === "false" ? false : Number(v)]),
        ),
        billing: { product_uuid: product.trim() || null },
      }),
    onSuccess: (p) => {
      toast({ variant: "success", title: `Version ${p.version} published` });
      void client.invalidateQueries({ queryKey: ["oh-hp"] });
      onClose();
    },
    onError: (error) => toast({ variant: "error", title: "Not published", description: errorText(error) }),
  });

  return (
    <Drawer title={policy.name} description={`${PROGRAM_LABEL[policy.program]} · version ${policy.version ?? "—"}`} onClose={onClose} wide>
      {s?.standard ? (
        <div className="space-y-0.5 text-[12px] text-dash-muted" data-testid="oh-hp-policy-standard">
          <p className="font-medium text-brand-navy">{s.standard.name}</p>
          <p>{s.standard.citation}</p>
          {s.standard.notes ? <p>{s.standard.notes}</p> : null}
        </div>
      ) : null}
      {s?.disclaimer ? <p className="text-[12px] text-amber-700">{s.disclaimer}</p> : null}
      <Field label="Check every (months)" type="number" value={freq} onChange={setFreq} required />
      <CheckField label="Applies to everyone" checked={all} onChange={setAll} />
      <Field label="Job titles (comma separated)" value={roles} onChange={setRoles} />
      <Field label="Departments" value={departments} onChange={setDepartments} />
      <Field label="Sites" value={sites} onChange={setSites} />
      <Field label="Exposure codes from hazard profiles (e.g. NOISE, DUST)" value={exposures} onChange={setExposures} />
      <div className="grid grid-cols-2 gap-3">
        {Object.keys(thresholds).map((key) => (
          <Field key={key} label={key.replace(/_/g, " ")} value={thresholds[key]} onChange={(v) => setThresholds((prev) => ({ ...prev, [key]: v }))} />
        ))}
      </div>
      <Field label="Billing product id (optional)" value={product} onChange={setProduct} />
      <DrawerActions>
        <SecondaryButton size="sm" onClick={onClose}>
          Cancel
        </SecondaryButton>
        <PageActionButton disabled={publish.isPending} onClick={() => publish.mutate()}>
          Publish new version
        </PageActionButton>
      </DrawerActions>
    </Drawer>
  );
}

export function HpPoliciesPage() {
  const { toast } = useToast();
  const client = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");
  const [open, setOpen] = useState<HpPolicy | null>(null);
  const query = useQuery({ queryKey: ["oh-hp", "policies"], queryFn: () => fetchHpPolicies() });
  const seed = useMutation({
    mutationFn: seedHpPolicies,
    onSuccess: (d) => {
      toast({ variant: "success", title: "Example policies loaded", description: `${d.created} added. Review before use.` });
      void client.invalidateQueries({ queryKey: ["oh-hp"] });
    },
    onError: (error) => toast({ variant: "error", title: "Not loaded", description: errorText(error) }),
  });
  const seedReference = useMutation({
    mutationFn: seedHpReferencePolicies,
    onSuccess: (d) => {
      toast({
        variant: "success",
        title: "Reference standards loaded",
        description: `${d.created} added. They are configurable defaults, not legal or clinical advice.`,
      });
      void client.invalidateQueries({ queryKey: ["oh-hp"] });
    },
    onError: (error) => toast({ variant: "error", title: "Not loaded", description: errorText(error) }),
  });
  const rows = (query.data ?? []).filter((p) => tab === "all" || p.program === tab);

  return (
    <ImmPageShell title="Programme policies" testId="oh-hp-policies-page">
      <ImmTabsBar<Tab>
        label="Programmes"
        tabs={[{ key: "all" as Tab, label: "All", count: query.data?.length }, ...HP_PROGRAMS.map((p) => ({ key: p as Tab, label: PROGRAM_LABEL[p] }))]}
        active={tab}
        onChange={setTab}
        actions={
          <>
            <SecondaryButton size="sm" className="h-8" disabled={seedReference.isPending} onClick={() => seedReference.mutate()}>
              Load reference standards
            </SecondaryButton>
            <SecondaryButton size="sm" className="h-8" disabled={seed.isPending} onClick={() => seed.mutate()}>
              Load examples
            </SecondaryButton>
          </>
        }
      />
      <ImmNotice>Each change publishes a new version. Results keep the version they were checked against.</ImmNotice>
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error, "Could not load policies.")}</LoadError> : null}
      {query.isSuccess && rows.length === 0 ? (
        <EmptyAction
          icon="clipboard"
          title="No programme policies"
          description="Load the examples for hearing, lung function, vision, ergonomics and fatigue, then adjust them."
          action={
            <PageActionButton disabled={seed.isPending} onClick={() => seed.mutate()}>
              Load examples
            </PageActionButton>
          }
        />
      ) : null}
      {rows.length > 0 ? (
        <ImmRecordTable columns={["Policy", "Programme", "Who", "Every", "Version", "Actions"]}>
          {rows.map((p) => (
            <DaRow key={p.uuid} testId="oh-hp-policy-row" onClick={() => setOpen(p)}>
              <DaCell first>
                <ImmPrimaryCell title={p.name} detail={p.is_example ? `${p.code} · example` : p.code.startsWith("ref_") ? `${p.code} · reference standard` : p.code} />
              </DaCell>
              <DaCell>{PROGRAM_LABEL[p.program]}</DaCell>
              <DaCell>
                {p.snapshot?.assignment.all
                  ? "Everyone"
                  : [...(p.snapshot?.assignment.roles ?? []), ...(p.snapshot?.assignment.exposures ?? []), ...(p.snapshot?.assignment.departments ?? []), ...(p.snapshot?.assignment.sites ?? [])].join(", ") || "—"}
              </DaCell>
              <DaCell>{p.snapshot ? `${p.snapshot.frequency_months} months` : "—"}</DaCell>
              <DaCell>v{p.version ?? "—"}</DaCell>
              <DaCell actions>
                <ImmRowAction onClick={() => setOpen(p)}>Edit</ImmRowAction>
              </DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      ) : null}
      {open ? <PolicyDrawer policy={open} onClose={() => setOpen(null)} /> : null}
    </ImmPageShell>
  );
}
