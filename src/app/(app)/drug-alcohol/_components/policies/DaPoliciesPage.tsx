"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { CheckField, Field, SelectField } from "@/app/(app)/immunizations/_components/shared/Field";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import {
  ImmPrimaryCell,
  ImmRecordTable,
  ImmRowAction,
  ImmStatusBadge,
} from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmNotice, ImmTabsBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import {
  createDaPolicy,
  fetchDaPolicies,
  fetchDaPolicy,
  publishDaPolicy,
  seedDaPolicies,
  type DaPolicy,
  type DaPolicySnapshot,
} from "@/features/occupational-health/services/drug-alcohol.service";
import { useToast } from "@/providers/toast-provider";
import { REASON_LABEL, SPECIMEN_LABEL, errorText, fmtDate, label } from "../shared/da-format";
import { DaCell, DaFact, DaRow, DaSection } from "../shared/da-ui";

type View = "mine" | "examples";

export function DaPoliciesPage() {
  const { toast } = useToast();
  const client = useQueryClient();
  const [view, setView] = useState<View>("mine");
  const [open, setOpen] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["oh-da", "policies"], queryFn: fetchDaPolicies });
  const all = query.data ?? [];
  const mine = all.filter((p) => !p.is_example);
  const examples = all.filter((p) => p.is_example);
  const rows = view === "mine" ? mine : examples;
  const seed = useMutation({
    mutationFn: seedDaPolicies,
    onSuccess: (out) => {
      toast({ variant: "success", title: out.created > 0 ? "Example policies added" : "Examples already loaded" });
      setView("examples");
      void client.invalidateQueries({ queryKey: ["oh-da", "policies"] });
    },
    onError: (error) => toast({ variant: "error", title: "Not loaded", description: errorText(error) }),
  });

  return (
    <ImmPageShell title="Policies" testId="oh-da-policies-page">
      <ImmTabsBar<View>
        label="Policy views"
        tabs={[
          { key: "mine", label: "Our policies", count: mine.length },
          { key: "examples", label: "Examples", count: examples.length },
        ]}
        active={view}
        onChange={setView}
        actions={
          <SecondaryButton className="h-8" disabled={seed.isPending} onClick={() => seed.mutate()}>
            Load examples
          </SecondaryButton>
        }
      />
      {mine.length === 0 && query.isSuccess ? (
        <ImmNotice tone="warning">
          No policy of your own yet. Tests use the example workplace policy until you copy and publish one.
        </ImmNotice>
      ) : null}
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error, "Could not load policies.")}</LoadError> : null}
      {query.isSuccess && rows.length === 0 ? (
        <EmptyAction
          icon="flask"
          title={view === "mine" ? "No policies yet" : "No examples loaded"}
          description="Load the example packs, then copy one and adjust it to your rules."
          action={
            <PageActionButton disabled={seed.isPending} onClick={() => seed.mutate()}>
              Load examples
            </PageActionButton>
          }
        />
      ) : null}
      {query.isSuccess && rows.length > 0 ? (
        <ImmRecordTable columns={["Policy", "Standard", "Version", "Published", "Actions"]}>
          {rows.map((p) => (
            <DaRow key={p.uuid} testId="oh-da-policy-row" onClick={() => setOpen(p.uuid)}>
              <DaCell first>
                <ImmPrimaryCell title={p.name} detail={p.employer_name ?? p.code} />
              </DaCell>
              <DaCell>{p.standard || "—"}</DaCell>
              <DaCell>
                {p.published_version ? (
                  <ImmStatusBadge status="complete" label={`v${p.published_version.number}`} />
                ) : (
                  <ImmStatusBadge status="pending" label="Draft" />
                )}
              </DaCell>
              <DaCell>{fmtDate(p.published_version?.published_at)}</DaCell>
              <DaCell actions>
                <ImmRowAction onClick={() => setOpen(p.uuid)}>{p.is_example ? "View" : "Edit"}</ImmRowAction>
              </DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      ) : null}
      {open ? (
        <PolicySheet
          uuid={open}
          onClose={() => setOpen(null)}
          onCopied={(created) => {
            setView("mine");
            setOpen(created.uuid);
          }}
        />
      ) : null}
    </ImmPageShell>
  );
}

function PolicySheet({ uuid, onClose, onCopied }: { uuid: string; onClose: () => void; onCopied: (p: DaPolicy) => void }) {
  const { toast } = useToast();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["oh-da", "policy", uuid], queryFn: () => fetchDaPolicy(uuid) });
  const policy = query.data;
  const snapshot = (policy?.draft_snapshot ?? policy?.published_version?.snapshot) as DaPolicySnapshot | undefined;
  return (
    <Drawer title={policy?.name ?? "Policy"} description={policy?.standard} onClose={onClose} wide>
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error)}</LoadError> : null}
      {policy && snapshot ? (
        <PolicyEditor
          key={`${policy.uuid}-${policy.published_version?.number ?? 0}`}
          policy={policy}
          snapshot={snapshot}
          onClose={onClose}
          onSaved={(next, copied) => {
            void client.invalidateQueries({ queryKey: ["oh-da", "policies"] });
            void client.invalidateQueries({ queryKey: ["oh-da", "policy"] });
            toast({ variant: "success", title: copied ? "Copied - adjust and publish" : "New version published" });
            if (copied) onCopied(next);
          }}
        />
      ) : null}
    </Drawer>
  );
}

function PolicyEditor({
  policy,
  snapshot,
  onClose,
  onSaved,
}: {
  policy: DaPolicy;
  snapshot: DaPolicySnapshot;
  onClose: () => void;
  onSaved: (policy: DaPolicy, copied: boolean) => void;
}) {
  const { toast } = useToast();
  const [gate, setGate] = useState<string>(snapshot.fitness_gate ?? "warn");
  const [screen, setScreen] = useState(String(snapshot.alcohol?.screen_threshold ?? 0.02));
  const [restricted, setRestricted] = useState(String(snapshot.alcohol?.restricted_threshold ?? 0.02));
  const [positive, setPositive] = useState(String(snapshot.alcohol?.positive_threshold ?? 0.04));
  const [split, setSplit] = useState(Boolean(snapshot.collection?.split_specimen));
  const [dilute, setDilute] = useState(String(snapshot.collection?.dilute_negative_rule ?? "accept"));
  const [allCritical, setAllCritical] = useState(Boolean(snapshot.safety_critical?.all));
  const [zones, setZones] = useState((snapshot.safety_critical?.zones ?? []).join(", "));
  const [labProduct, setLabProduct] = useState(snapshot.billing?.confirmation_lab_product_uuid ?? "");
  const [followups, setFollowups] = useState(String(snapshot.rtd?.followup_tests ?? 6));
  const [months, setMonths] = useState(String(snapshot.rtd?.followup_months ?? 12));
  const [keepNeg, setKeepNeg] = useState(String(snapshot.retention?.negative_years ?? 1));
  const [keepPos, setKeepPos] = useState(String(snapshot.retention?.non_negative_years ?? 5));

  const build = (): DaPolicySnapshot => ({
    ...snapshot,
    fitness_gate: gate as DaPolicySnapshot["fitness_gate"],
    alcohol: {
      ...snapshot.alcohol,
      screen_threshold: Number(screen),
      restricted_threshold: Number(restricted),
      positive_threshold: Number(positive),
    },
    collection: { ...snapshot.collection, split_specimen: split, dilute_negative_rule: dilute },
    safety_critical: {
      ...(snapshot.safety_critical ?? {}),
      all: allCritical,
      zones: zones
        .split(",")
        .map((z) => z.trim())
        .filter(Boolean),
    },
    billing: { ...(snapshot.billing ?? {}), confirmation_lab_product_uuid: labProduct.trim() || null },
    rtd: { ...(snapshot.rtd ?? {}), followup_tests: Number(followups), followup_months: Number(months) },
    retention: { negative_years: Number(keepNeg), non_negative_years: Number(keepPos) },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (policy.is_example) {
        const created = await createDaPolicy({
          code: `${policy.code}-local`.slice(0, 60),
          name: `${policy.name} (our copy)`,
          standard: policy.standard,
          description: policy.description,
          snapshot: build(),
        });
        return { policy: created, copied: true };
      }
      return { policy: await publishDaPolicy(policy.uuid, build()), copied: false };
    },
    onSuccess: (out) => onSaved(out.policy, out.copied),
    onError: (error) => toast({ variant: "error", title: "Not saved", description: errorText(error) }),
  });

  return (
    <div className="space-y-4" data-testid="oh-da-policy-editor">
      {snapshot.disclaimer ? <p className="text-[12px] text-dash-muted">{snapshot.disclaimer}</p> : null}
      <DaSection title="What it covers">
        <DaFact label="Reasons">{snapshot.reasons.map((r) => label(REASON_LABEL, r)).join(", ")}</DaFact>
        <DaFact label="Specimens">{snapshot.specimen_types.map((s) => label(SPECIMEN_LABEL, s)).join(", ")}</DaFact>
        <DaFact label="Drug panel">{snapshot.panel.map((p) => p.name).join(", ")}</DaFact>
        {policy.versions?.length ? (
          <DaFact label="Versions">{policy.versions.map((v) => `v${v.number} ${v.status}`).join(" · ")}</DaFact>
        ) : null}
      </DaSection>
      <DaSection title="Settings">
        <div className="space-y-2">
          <SelectField label="When a worker is not fit" value={gate} onChange={setGate}>
            <option value="off">Do nothing at sign-off</option>
            <option value="warn">Warn at fitness sign-off</option>
            <option value="block">Block fit sign-off and zone access</option>
          </SelectField>
          <Field label={`Alcohol screen level that needs a confirmation (${snapshot.alcohol.unit})`} value={screen} onChange={setScreen} />
          <Field label="Alcohol level that stands someone down" value={restricted} onChange={setRestricted} />
          <Field label="Alcohol level that counts as positive" value={positive} onChange={setPositive} />
          <CheckField label="Collect a split specimen" checked={split} onChange={setSplit} />
          <SelectField label="Dilute negative result" value={dilute} onChange={setDilute}>
            <option value="accept">Accept as negative</option>
            <option value="retest">Retest</option>
            <option value="retest_observed">Retest, observed</option>
          </SelectField>
          <CheckField label="Treat every worker as safety-critical" checked={allCritical} onChange={setAllCritical} />
          <Field label="Safety-critical zones (comma separated codes)" value={zones} onChange={setZones} />
          <Field label="Lab confirmation product ID (for billing)" value={labProduct} onChange={setLabProduct} />
          <Field label="Follow-up tests after return to duty" type="number" value={followups} onChange={setFollowups} />
          <Field label="Follow-up period (months)" type="number" value={months} onChange={setMonths} />
          <Field label="Keep negative records (years)" type="number" value={keepNeg} onChange={setKeepNeg} />
          <Field label="Keep non-negative records (years)" type="number" value={keepPos} onChange={setKeepPos} />
        </div>
      </DaSection>
      <DrawerActions>
        <SecondaryButton onClick={onClose}>Close</SecondaryButton>
        <PageActionButton disabled={save.isPending} onClick={() => save.mutate()}>
          {policy.is_example ? "Copy to our policies" : "Publish new version"}
        </PageActionButton>
      </DrawerActions>
    </div>
  );
}
