"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { CheckField, Field, SelectField } from "@/app/(app)/immunizations/_components/shared/Field";
import { ImmInsightStrip } from "@/app/(app)/immunizations/_components/shared/ImmInsightStrip";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import {
  ImmPrimaryCell,
  ImmRecordTable,
  ImmRowAction,
  ImmStatusBadge,
} from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmTabsBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import {
  createDaPool,
  drawDaPool,
  fetchDaCompliance,
  fetchDaDraws,
  fetchDaPolicies,
  fetchDaPools,
  previewDaPool,
  type DaDraw,
  type DaPool,
} from "@/features/occupational-health/services/drug-alcohol.service";
import { useToast } from "@/providers/toast-provider";
import { errorText, fmtDateTime } from "../shared/da-format";
import { DaCell, DaFact, DaRow, DaSection } from "../shared/da-ui";

type View = "pools" | "draws";

const splitList = (text: string) =>
  text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export function DaRandomPage() {
  const { toast } = useToast();
  const client = useQueryClient();
  const [view, setView] = useState<View>("pools");
  const [creating, setCreating] = useState(false);
  const [drawing, setDrawing] = useState<DaPool | null>(null);
  const [openDraw, setOpenDraw] = useState<DaDraw | null>(null);
  const pools = useQuery({ queryKey: ["oh-da", "pools"], queryFn: fetchDaPools });
  const draws = useQuery({ queryKey: ["oh-da", "draws"], queryFn: () => fetchDaDraws(), enabled: view === "draws" });
  const compliance = useQuery({ queryKey: ["oh-da", "compliance"], queryFn: () => fetchDaCompliance() });
  const behind = (compliance.data ?? []).filter((c) => !c.drug_on_track || !c.alcohol_on_track).length;

  return (
    <ImmPageShell title="Random testing" testId="oh-da-random-page">
      <ImmTabsBar<View>
        label="Random testing views"
        tabs={[
          { key: "pools", label: "Pools", count: pools.data?.length },
          { key: "draws", label: "Draw history" },
        ]}
        active={view}
        onChange={setView}
        actions={<PageActionButton onClick={() => setCreating(true)}>New pool</PageActionButton>}
      />
      <ImmInsightStrip
        testId="oh-da-random-insights"
        items={[
          { label: "Active pools", value: (pools.data ?? []).filter((p) => p.active).length },
          {
            label: "Drug tests this year",
            value: (compliance.data ?? []).reduce((s, c) => s + c.drug_tests_done, 0),
            hint: `of ${(compliance.data ?? []).reduce((s, c) => s + c.drug_tests_required, 0)} required`,
          },
          {
            label: "Alcohol tests this year",
            value: (compliance.data ?? []).reduce((s, c) => s + c.alcohol_tests_done, 0),
            hint: `of ${(compliance.data ?? []).reduce((s, c) => s + c.alcohol_tests_required, 0)} required`,
          },
          { label: "Pools behind target", value: behind, tone: behind > 0 ? "warning" : "success" },
        ]}
      />
      {view === "pools" ? (
        <>
          {pools.isLoading ? <QuietLoading /> : null}
          {pools.isError ? <LoadError>{errorText(pools.error, "Could not load pools.")}</LoadError> : null}
          {pools.isSuccess && pools.data.length === 0 ? (
            <EmptyAction
              icon="flask"
              title="No random pools yet"
              description="A pool is the group of workers who can be picked at random, with a yearly testing rate."
              action={<PageActionButton onClick={() => setCreating(true)}>New pool</PageActionButton>}
            />
          ) : null}
          {pools.isSuccess && pools.data.length > 0 ? (
            <ImmRecordTable columns={["Pool", "Yearly rate", "How often", "Last draw", "Status", "Actions"]}>
              {pools.data.map((p) => (
                <DaRow key={p.uuid} testId="oh-da-pool-row">
                  <DaCell first>
                    <ImmPrimaryCell title={p.name} detail={p.policy_name ?? "Default policy"} />
                  </DaCell>
                  <DaCell>
                    Drugs {p.annual_drug_rate}% · Alcohol {p.annual_alcohol_rate}%
                  </DaCell>
                  <DaCell>{p.frequency}</DaCell>
                  <DaCell>{p.last_period ? `${p.last_period} (${fmtDateTime(p.last_draw_at)})` : "Never"}</DaCell>
                  <DaCell>
                    <ImmStatusBadge status={p.active ? "open" : "closed"} label={p.active ? "Active" : "Paused"} />
                  </DaCell>
                  <DaCell actions>
                    <ImmRowAction disabled={!p.active} onClick={() => setDrawing(p)}>
                      Draw
                    </ImmRowAction>
                  </DaCell>
                </DaRow>
              ))}
            </ImmRecordTable>
          ) : null}
        </>
      ) : (
        <>
          {draws.isLoading ? <QuietLoading /> : null}
          {draws.isError ? <LoadError>{errorText(draws.error, "Could not load draws.")}</LoadError> : null}
          {draws.isSuccess && draws.data.length === 0 ? (
            <EmptyAction icon="flask" title="No draws yet" description="Draws appear here with their audit details." />
          ) : null}
          {draws.isSuccess && draws.data.length > 0 ? (
            <ImmRecordTable columns={["Period", "Drawn", "Eligible", "Picked", "Actions"]}>
              {draws.data.map((d) => (
                <DaRow key={d.uuid} testId="oh-da-draw-row" onClick={() => setOpenDraw(d)}>
                  <DaCell first>
                    <ImmPrimaryCell title={d.period_label} detail={d.pool_name} />
                  </DaCell>
                  <DaCell>{fmtDateTime(d.drawn_at)}</DaCell>
                  <DaCell>{d.population_size}</DaCell>
                  <DaCell>
                    {d.drug_selected} drug · {d.alcohol_selected} alcohol · {d.alternates} standby
                  </DaCell>
                  <DaCell actions>
                    <ImmRowAction onClick={() => setOpenDraw(d)}>Details</ImmRowAction>
                  </DaCell>
                </DaRow>
              ))}
            </ImmRecordTable>
          ) : null}
        </>
      )}
      {creating ? (
        <PoolSheet
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            toast({ variant: "success", title: "Pool created" });
            void client.invalidateQueries({ queryKey: ["oh-da"] });
          }}
        />
      ) : null}
      {drawing ? (
        <DrawSheet
          pool={drawing}
          onClose={() => setDrawing(null)}
          onDrawn={(draw) => {
            setDrawing(null);
            setOpenDraw(draw);
            toast({ variant: "success", title: "Draw done", description: "Picked workers are on the Due list." });
            void client.invalidateQueries({ queryKey: ["oh-da"] });
          }}
        />
      ) : null}
      {openDraw ? <DrawDetail draw={openDraw} onClose={() => setOpenDraw(null)} /> : null}
    </ImmPageShell>
  );
}

function PoolSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const policies = useQuery({ queryKey: ["oh-da", "policies"], queryFn: fetchDaPolicies });
  const [name, setName] = useState("");
  const [policy, setPolicy] = useState("");
  const [drugRate, setDrugRate] = useState("50");
  const [alcoholRate, setAlcoholRate] = useState("10");
  const [frequency, setFrequency] = useState<DaPool["frequency"]>("monthly");
  const [departments, setDepartments] = useState("");
  const [jobs, setJobs] = useState("");
  const [sites, setSites] = useState("");
  const [critical, setCritical] = useState(true);
  const [windowMinutes, setWindowMinutes] = useState("120");
  const [alternates, setAlternates] = useState("2");
  const save = useMutation({
    mutationFn: () =>
      createDaPool({
        name: name.trim(),
        policy_uuid: policy || null,
        annual_drug_rate: Number(drugRate),
        annual_alcohol_rate: Number(alcoholRate),
        frequency,
        criteria: {
          departments: splitList(departments),
          job_titles: splitList(jobs),
          sites: splitList(sites),
          safety_critical_only: critical,
        },
        proceed_window_minutes: Number(windowMinutes),
        alternates_count: Number(alternates),
        active: true,
      }),
    onSuccess: onSaved,
    onError: (error) => toast({ variant: "error", title: "Not saved", description: errorText(error) }),
  });
  return (
    <Drawer title="New random pool" description="Who can be picked, and how often" onClose={onClose}>
      <Field label="Name" value={name} onChange={setName} required placeholder="e.g. Mine site - drivers" />
      <SelectField label="Policy" value={policy} onChange={setPolicy}>
        <option value="">Default policy</option>
        {(policies.data ?? []).map((p) => (
          <option key={p.uuid} value={p.uuid}>
            {p.name}
          </option>
        ))}
      </SelectField>
      <Field label="Yearly drug testing rate (%)" type="number" value={drugRate} onChange={setDrugRate} />
      <Field label="Yearly alcohol testing rate (%)" type="number" value={alcoholRate} onChange={setAlcoholRate} />
      <SelectField label="Draw" value={frequency} onChange={(v) => setFrequency(v as DaPool["frequency"])}>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="quarterly">Quarterly</option>
      </SelectField>
      <Field label="Departments (comma separated, blank = all)" value={departments} onChange={setDepartments} />
      <Field label="Job titles (comma separated, blank = all)" value={jobs} onChange={setJobs} />
      <Field label="Sites (comma separated, blank = all)" value={sites} onChange={setSites} />
      <CheckField label="Only safety-critical workers" checked={critical} onChange={setCritical} />
      <Field label="Minutes to report after being told" type="number" value={windowMinutes} onChange={setWindowMinutes} />
      <Field label="Standby picks per draw" type="number" value={alternates} onChange={setAlternates} />
      <DrawerActions>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PageActionButton disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>
          Create pool
        </PageActionButton>
      </DrawerActions>
    </Drawer>
  );
}

function DrawSheet({ pool, onClose, onDrawn }: { pool: DaPool; onClose: () => void; onDrawn: (draw: DaDraw) => void }) {
  const { toast } = useToast();
  const preview = useQuery({ queryKey: ["oh-da", "preview", pool.uuid], queryFn: () => previewDaPool(pool.uuid) });
  const draw = useMutation({
    mutationFn: () => drawDaPool(pool.uuid),
    onSuccess: onDrawn,
    onError: (error) => toast({ variant: "error", title: "Draw not done", description: errorText(error) }),
  });
  return (
    <Drawer title={`Draw - ${pool.name}`} description="Picks are random and recorded for audit" onClose={onClose}>
      {preview.isLoading ? <QuietLoading /> : null}
      {preview.isError ? <LoadError>{errorText(preview.error)}</LoadError> : null}
      {preview.data ? (
        <DaSection title="This draw">
          <DaFact label="Period">{preview.data.next_period}</DaFact>
          <DaFact label="Eligible workers">{preview.data.population}</DaFact>
          <DaFact label="Drug tests to pick">{preview.data.drug_per_draw}</DaFact>
          <DaFact label="Alcohol tests to pick">{preview.data.alcohol_per_draw}</DaFact>
          <DaFact label="Standby picks">{pool.alternates_count}</DaFact>
        </DaSection>
      ) : null}
      <p className="text-[12px] text-dash-muted">
        Everyone in the pool has the same chance every draw, even if they were picked before. Only one draw per period.
      </p>
      <DrawerActions>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PageActionButton disabled={draw.isPending || !preview.data || preview.data.population === 0} onClick={() => draw.mutate()}>
          Draw now
        </PageActionButton>
      </DrawerActions>
    </Drawer>
  );
}

function DrawDetail({ draw, onClose }: { draw: DaDraw; onClose: () => void }) {
  return (
    <Drawer title={`Draw ${draw.period_label}`} description={draw.pool_name ?? undefined} onClose={onClose} wide>
      <DaSection title="Picked">
        {draw.selections.length === 0 ? <p className="text-[13px] text-dash-muted">Nobody was picked.</p> : null}
        {draw.selections.map((s) => (
          <DaFact key={s.uuid} label={`#${s.rank} ${s.customer_initials || "—"}${s.is_alternate ? " (standby)" : ""}`}>
            {s.kind.replace("both", "drug + alcohol")} · <ImmStatusBadge status={s.overdue ? "overdue" : s.status} />
          </DaFact>
        ))}
      </DaSection>
      <DaSection title="Audit">
        <DaFact label="Method">{draw.algorithm}</DaFact>
        <DaFact label="Drawn by">{draw.drawn_by || "—"}</DaFact>
        <DaFact label="Eligible list fingerprint">
          <span className="break-all font-mono text-[11px]">{draw.population_hash}</span>
        </DaFact>
        <DaFact label="Seed">
          <span className="break-all font-mono text-[11px]">{draw.seed_hex}</span>
        </DaFact>
        <DaFact label="Seed fingerprint">
          <span className="break-all font-mono text-[11px]">{draw.seed_commitment}</span>
        </DaFact>
      </DaSection>
      <p className="text-[12px] text-dash-muted">
        Anyone with the eligible list and the seed can repeat this draw and get the same picks.
      </p>
    </Drawer>
  );
}
