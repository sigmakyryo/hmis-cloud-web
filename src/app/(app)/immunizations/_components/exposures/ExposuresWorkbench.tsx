"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppIcon } from "@/components/icons/app-icon";
import { PageActionButton, PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/constants/routes";
import { ListPageDataTableCell, ListPageDataTableRow } from "@/features/app-shell/components/page-layout";
import { Drawer, DrawerActions } from "../shared/Drawer";
import { EmptyAction } from "../shared/EmptyAction";
import { CheckField, Field, SelectField } from "../shared/Field";
import { ImmInsightStrip } from "../shared/ImmInsightStrip";
import { ImmPrimaryCell, ImmRecordTable, ImmRowAction, ImmStatusBadge, humanize } from "../shared/ImmRecordTable";
import { ImmFilterSelect, ImmSearchBar } from "../shared/ImmSearchBar";
import { ImmNotice, ImmTabsBar } from "../shared/ImmTabsBar";
import { ImmAvatar, ImmClockMeter, ImmDateCell, daysFromToday } from "../shared/ImmVisuals";
import { LoadError, QuietLoading } from "../shared/QuietLoading";
import { useImmList } from "../shared/use-imm-list";
import { acceptExposureNote, draftExposureNote, draftRecall } from "@/features/occupational-health/services/visit-copilot.service";
import { OhCopilotResult } from "@/features/occupational-health/components/OhCopilotResult";
import type { CopilotResponse } from "@/features/occupational-health/services/visit-copilot.service";
import {
  type OhImmExposure,
  completeOhImmExposureFollowup,
  createOhImmExposure,
  createOhImmExposureOncall,
  fetchOhImmExposureDueFollowups,
  fetchOhImmExposureOncall,
  fetchOhImmExposures,
  recordOhImmExposureAction,
  seedOhImmExposureTypes,
  updateOhImmExposureSource,
} from "@/features/occupational-health/services/immunisation.service";

type ExposureView = "incidents" | "followups" | "oncall";

const EXPOSURE_TYPES = [
  ["needlestick", "Needlestick"],
  ["sharps", "Sharps"],
  ["splash_mucous", "Splash (mucous)"],
  ["bite", "Bite"],
  ["airborne", "Airborne"],
  ["other", "Other"],
] as const;

const INCIDENT_ACTIONS = [
  ["pep", "HIV PEP"],
  ["hbig", "HBIG"],
  ["vaccine", "Vaccine"],
  ["tetanus", "Tetanus"],
  ["lab_baseline", "Baseline labs"],
  ["consent_exposed", "Consent (exposed)"],
] as const;

function emptyIncident() {
  return {
    customer_uuid: "",
    exposed_at: new Date().toISOString().slice(0, 16),
    exposure_type: "needlestick",
    body_site: "",
    device: "",
    source_known: "unknown",
    first_aid_done: false,
    site: "",
    pathway_code: "",
  };
}

const EMPTY_ONCALL = { name: "", phone: "", email: "", site: "", shift: "any" };

const TRIAGE_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function pastTarget(row: OhImmExposure): boolean {
  return (row.clocks ?? []).some((clock) => clock.overdue || (clock.seconds_remaining != null && clock.seconds_remaining < 0));
}

function nearestClock(row: OhImmExposure): number | null {
  const pending = (row.clocks ?? []).map((clock) => clock.seconds_remaining).filter((s): s is number => s != null);
  return pending.length ? Math.min(...pending) : null;
}

export function ExposuresWorkbench() {
  const qc = useQueryClient();
  const listQ = useQuery({ queryKey: ["oh-imm-exposures"], queryFn: () => fetchOhImmExposures({ status: "open" }) });
  const followQ = useQuery({ queryKey: ["oh-imm-exp-followups"], queryFn: () => fetchOhImmExposureDueFollowups(30) });
  const oncallQ = useQuery({ queryKey: ["oh-imm-exp-oncall"], queryFn: () => fetchOhImmExposureOncall() });
  const [view, setView] = useState<ExposureView>("incidents");
  const [form, setForm] = useState(emptyIncident);
  const [oncall, setOncall] = useState(EMPTY_ONCALL);
  const [sheet, setSheet] = useState<"incident" | "oncall" | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [triage, setTriage] = useState("");
  const [exposureType, setExposureType] = useState("");
  const [lateOnly, setLateOnly] = useState(false);

  const rows = listQ.data ?? [];
  const followups = followQ.data ?? [];
  const contacts = oncallQ.data ?? [];
  const incidentList = useImmList({
    rows: rows.filter(
      (row) =>
        (!triage || row.triage_band === triage) &&
        (!exposureType || row.exposure_type === exposureType) &&
        (!lateOnly || pastTarget(row)),
    ),
    searchText: (row) => [row.customer_initials, row.exposure_type, row.site, row.body_site, row.device].join(" "),
    sortValue: (row, key) =>
      key === "when" ? row.exposed_at : key === "triage" ? (TRIAGE_RANK[row.triage_band] ?? 9) : key === "type" ? row.exposure_type : nearestClock(row),
    defaultSort: { key: "triage", direction: "asc" },
  });
  const followupList = useImmList({
    rows: followups,
    searchText: (row) => [row.customer_initials, row.label, row.exposure_type].map(String).join(" "),
    sortValue: (row, key) => (key === "label" ? String(row.label ?? "") : String(row.due_date ?? "")),
    defaultSort: { key: "due", direction: "asc" },
  });
  const contactList = useImmList({
    rows: contacts,
    searchText: (row) => [row.name, row.site, row.phone, row.email].map(String).join(" "),
    sortValue: (row, key) => (key === "name" ? String(row.name) : Number(row.escalation_order ?? 99)),
    defaultSort: { key: "order", direction: "asc" },
  });

  const refreshIncidents = () => {
    void qc.invalidateQueries({ queryKey: ["oh-imm-exposures"] });
    void qc.invalidateQueries({ queryKey: ["oh-imm-exp-followups"] });
  };

  const create = useMutation({
    mutationFn: () =>
      createOhImmExposure({
        ...form,
        exposed_at: new Date(form.exposed_at).toISOString(),
      }),
    onSuccess: (row) => {
      setMsg(`Logged ${humanize(row.exposure_type)} · triage ${row.triage_band}.`);
      setForm(emptyIncident());
      setSheet(null);
      setSelected(row.uuid);
      refreshIncidents();
    },
    onError: (e: Error) => setMsg(e.message),
  });
  const seed = useMutation({
    mutationFn: seedOhImmExposureTypes,
    onSuccess: (r) => setMsg(`Exposure type defaults ready (${r.seeded} new).`),
    onError: (e: Error) => setMsg(e.message),
  });
  const addOncall = useMutation({
    mutationFn: () => createOhImmExposureOncall(oncall),
    onSuccess: () => {
      setOncall(EMPTY_ONCALL);
      setSheet(null);
      void qc.invalidateQueries({ queryKey: ["oh-imm-exp-oncall"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  if (listQ.isLoading) return <QuietLoading />;
  if (listQ.isError) return <LoadError>Could not load exposures. Check your connection and try again.</LoadError>;

  const urgentCount = rows.filter((row) => row.triage_band === "urgent").length;
  const lateCount = rows.filter(pastTarget).length;
  const followupsThisWeek = followups.filter((row) => {
    const days = daysFromToday(String(row.due_date ?? ""));
    return days != null && days <= 7;
  }).length;
  const active = rows.find((row) => row.uuid === selected) ?? null;

  return (
    <>
      <ImmTabsBar
        testId="oh-imm-exposures-panel"
        label="Exposure records"
        active={view}
        onChange={setView}
        tabs={[
          { key: "incidents", label: "Open incidents", count: rows.length },
          { key: "followups", label: "Follow-ups due", count: followups.length },
          { key: "oncall", label: "On-call", count: contacts.length },
        ]}
        actions={
          view === "oncall" ? (
            <PageActionButton type="button" onClick={() => setSheet("oncall")}>
              <AppIcon name="add" className="size-3.5" />
              Add contact
            </PageActionButton>
          ) : (
            <>
              <SecondaryButton type="button" className="h-8" disabled={seed.isPending} onClick={() => seed.mutate()}>
                Load exposure types
              </SecondaryButton>
              <PageActionButton type="button" onClick={() => setSheet("incident")}>
                <AppIcon name="add" className="size-3.5" />
                Log incident
              </PageActionButton>
            </>
          )
        }
      />
      {rows.length > 0 ? (
        <ImmInsightStrip
          testId="oh-imm-exposure-insights"
          items={[
            { label: "open incidents", value: rows.length },
            {
              label: "urgent",
              value: urgentCount,
              tone: urgentCount > 0 ? "danger" : "default",
              onSelect: () => {
                setView("incidents");
                setTriage((current) => (current === "urgent" ? "" : "urgent"));
              },
              active: view === "incidents" && triage === "urgent",
            },
            {
              label: "past target",
              value: lateCount,
              tone: lateCount > 0 ? "warning" : "default",
              hint: "PEP or HBIG clock",
              onSelect: () => {
                setView("incidents");
                setLateOnly((current) => !current);
              },
              active: view === "incidents" && lateOnly,
            },
            {
              label: "follow-ups this week",
              value: followupsThisWeek,
              onSelect: () => setView("followups"),
              active: view === "followups",
            },
            { label: "on-call contacts", value: contacts.length },
          ]}
        />
      ) : null}
      {msg ? <ImmNotice>{msg}</ImmNotice> : null}

      {view === "incidents" ? (
        rows.length === 0 ? (
          <EmptyAction
            icon="activity"
            title="No open exposures"
            description="Log an incident to start the PEP and HBIG clocks from the exposure time."
          />
        ) : (
          <>
            <ImmSearchBar
              value={incidentList.query}
              onChange={incidentList.setQuery}
              placeholder="Search employee, site, or device"
              matched={incidentList.controls.matched}
              total={rows.length}
              onClear={
                triage || exposureType || lateOnly || incidentList.query
                  ? () => {
                      setTriage("");
                      setExposureType("");
                      setLateOnly(false);
                      incidentList.setQuery("");
                    }
                  : undefined
              }
              filters={
                <>
                  <ImmFilterSelect label="Triage" value={triage} onChange={setTriage}>
                    <option value="">Any triage</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </ImmFilterSelect>
                  <ImmFilterSelect label="Exposure type" value={exposureType} onChange={setExposureType}>
                    <option value="">All types</option>
                    {EXPOSURE_TYPES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </ImmFilterSelect>
                </>
              }
            />
            {incidentList.pageRows.length === 0 ? (
              <EmptyAction icon="search" title="No matching incidents" description="Change the filters to see more incidents." />
            ) : (
              <ImmRecordTable
                list={incidentList.controls}
                columns={[
                  { label: "Employee" },
                  { label: "Exposure", sortKey: "type" },
                  { label: "When", sortKey: "when" },
                  { label: "Triage", sortKey: "triage" },
                  { label: "Prophylaxis windows", sortKey: "clock" },
                  "Actions",
                ]}
              >
                {incidentList.pageRows.map((row: OhImmExposure) => (
                  <ListPageDataTableRow
                    key={row.uuid}
                    className={row.triage_band === "urgent" ? "cursor-pointer bg-red-50/40" : "cursor-pointer"}
                    onClick={() => setSelected(row.uuid)}
                  >
                    <ListPageDataTableCell className="pl-4 md:pl-6">
                      <span className="inline-flex items-center gap-2">
                        <ImmAvatar text={row.customer_initials} />
                        <span className="font-mono text-[12px] text-brand-navy">{row.customer_initials}</span>
                      </span>
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <ImmPrimaryCell
                        title={humanize(row.exposure_type)}
                        detail={[row.body_site, row.device, row.site].filter(Boolean).join(" · ") || undefined}
                      />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell className="whitespace-nowrap">
                      {row.exposed_at?.slice(0, 16).replace("T", " ") ?? "—"}
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <ImmStatusBadge status={row.triage_band} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      {(row.clocks ?? []).length === 0 ? (
                        <span className="text-dash-muted">No clocks</span>
                      ) : (
                        <span className="flex flex-col gap-1.5 py-1">
                          {(row.clocks ?? []).map((clock) => (
                            <ImmClockMeter key={clock.code} clock={clock} exposedAt={row.exposed_at} />
                          ))}
                        </span>
                      )}
                    </ListPageDataTableCell>
                    <ListPageDataTableCell className="pr-4 text-right md:pr-6">
                      <ImmRowAction onClick={() => setSelected(row.uuid)}>Open</ImmRowAction>
                    </ListPageDataTableCell>
                  </ListPageDataTableRow>
                ))}
              </ImmRecordTable>
            )}
          </>
        )
      ) : null}

      {view === "followups" ? (
        followups.length === 0 ? (
          <EmptyAction icon="calendar" title="No follow-ups due" description="Exposure follow-up labs due in the next 30 days appear here." />
        ) : (
          <>
            <ImmSearchBar
              value={followupList.query}
              onChange={followupList.setQuery}
              placeholder="Search employee or follow-up"
              matched={followupList.controls.matched}
              total={followups.length}
              onClear={() => followupList.setQuery("")}
            />
            <ImmRecordTable
              list={followupList.controls}
              columns={["Employee", { label: "Follow-up", sortKey: "label" }, "Exposure", { label: "Due", sortKey: "due" }, "Status", "Actions"]}
            >
              {followupList.pageRows.map((row) => (
                <ListPageDataTableRow key={String(row.uuid)}>
                  <ListPageDataTableCell className="pl-4 md:pl-6">
                    <span className="inline-flex items-center gap-2 font-mono text-[12px]">
                      <ImmAvatar text={String(row.customer_initials ?? "")} />
                      {String(row.customer_initials ?? "—")}
                    </span>
                  </ListPageDataTableCell>
                  <ListPageDataTableCell className="font-medium text-brand-navy">{String(row.label ?? "—")}</ListPageDataTableCell>
                  <ListPageDataTableCell>{humanize(String(row.exposure_type ?? ""))}</ListPageDataTableCell>
                  <ListPageDataTableCell>
                    <ImmDateCell date={String(row.due_date ?? "")} warnWithinDays={7} />
                  </ListPageDataTableCell>
                  <ListPageDataTableCell>
                    <ImmStatusBadge status={String(row.status ?? "")} />
                  </ListPageDataTableCell>
                  <ListPageDataTableCell className="pr-4 text-right md:pr-6">
                    {row.status !== "done" ? (
                      <ImmRowAction
                        onClick={() =>
                          void completeOhImmExposureFollowup(String(row.uuid))
                            .then(refreshIncidents)
                            .catch((e: Error) => setMsg(e.message))
                        }
                      >
                        Mark done
                      </ImmRowAction>
                    ) : (
                      "—"
                    )}
                  </ListPageDataTableCell>
                </ListPageDataTableRow>
              ))}
            </ImmRecordTable>
          </>
        )
      ) : null}

      {view === "oncall" ? (
        contacts.length === 0 ? (
          <EmptyAction icon="users" title="No on-call contacts" description="Add the people to escalate to, by site and shift." />
        ) : (
          <>
            <ImmSearchBar
              value={contactList.query}
              onChange={contactList.setQuery}
              placeholder="Search name, site, or phone"
              matched={contactList.controls.matched}
              total={contacts.length}
              onClear={() => contactList.setQuery("")}
            />
            <ImmRecordTable
              list={contactList.controls}
              columns={[{ label: "Order", sortKey: "order" }, { label: "Contact", sortKey: "name" }, "Site", "Shift", "Phone", "Email"]}
            >
              {contactList.pageRows.map((contact) => (
                <ListPageDataTableRow key={String(contact.uuid)}>
                  <ListPageDataTableCell className="pl-4 md:pl-6">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-brand-navy text-[11px] font-semibold tabular-nums text-white">
                      {String(contact.escalation_order ?? "—")}
                    </span>
                  </ListPageDataTableCell>
                  <ListPageDataTableCell>
                    <span className="inline-flex items-center gap-2">
                      <ImmAvatar text={String(contact.name)} />
                      <span className="font-medium text-brand-navy">{String(contact.name)}</span>
                    </span>
                  </ListPageDataTableCell>
                  <ListPageDataTableCell>{String(contact.site ?? "") || "Any site"}</ListPageDataTableCell>
                  <ListPageDataTableCell>{humanize(String(contact.shift ?? "any"))}</ListPageDataTableCell>
                  <ListPageDataTableCell>
                    {contact.phone ? (
                      <a href={`tel:${String(contact.phone)}`} className="text-brand-primary hover:underline">
                        {String(contact.phone)}
                      </a>
                    ) : (
                      "—"
                    )}
                  </ListPageDataTableCell>
                  <ListPageDataTableCell>
                    {contact.email ? (
                      <a href={`mailto:${String(contact.email)}`} className="text-brand-primary hover:underline">
                        {String(contact.email)}
                      </a>
                    ) : (
                      "—"
                    )}
                  </ListPageDataTableCell>
                </ListPageDataTableRow>
              ))}
            </ImmRecordTable>
          </>
        )
      ) : null}
      <Drawer
        open={sheet === "incident"}
        title="Log incident"
        description="Clocks start from the exposure time. HIV PEP target 2 hours (max 72); HBIG target 24 hours (max 7 days)."
        onClose={() => setSheet(null)}
      >
        <Field label="Employee ID" required value={form.customer_uuid} onChange={(value) => setForm((f) => ({ ...f, customer_uuid: value }))} />
        <Field label="Exposed at" type="datetime-local" required value={form.exposed_at} onChange={(value) => setForm((f) => ({ ...f, exposed_at: value }))} />
        <SelectField label="Type" required value={form.exposure_type} onChange={(value) => setForm((f) => ({ ...f, exposure_type: value }))}>
          {EXPOSURE_TYPES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </SelectField>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Body site" value={form.body_site} onChange={(value) => setForm((f) => ({ ...f, body_site: value }))} />
          <Field label="Device" value={form.device} onChange={(value) => setForm((f) => ({ ...f, device: value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Source" value={form.source_known} onChange={(value) => setForm((f) => ({ ...f, source_known: value }))}>
            <option value="unknown">Unknown</option>
            <option value="known">Known</option>
          </SelectField>
          <Field label="Site" value={form.site} onChange={(value) => setForm((f) => ({ ...f, site: value }))} />
        </div>
        <CheckField label="First aid done" checked={form.first_aid_done} onChange={(checked) => setForm((f) => ({ ...f, first_aid_done: checked }))} />
        <DrawerActions>
          <SecondaryButton type="button" onClick={() => setSheet(null)}>Cancel</SecondaryButton>
          <PrimaryButton type="button" disabled={create.isPending || !form.customer_uuid.trim()} onClick={() => create.mutate()}>
            Log incident
          </PrimaryButton>
        </DrawerActions>
      </Drawer>

      <Drawer
        open={sheet === "oncall"}
        title="Add on-call contact"
        description="Escalation goes in order. Notifications are skipped when mail or SMS is not configured."
        onClose={() => setSheet(null)}
      >
        <Field label="Name" required value={oncall.name} onChange={(value) => setOncall((o) => ({ ...o, name: value }))} />
        <Field label="Phone" value={oncall.phone} onChange={(value) => setOncall((o) => ({ ...o, phone: value }))} />
        <Field label="Email" type="email" value={oncall.email} onChange={(value) => setOncall((o) => ({ ...o, email: value }))} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Site" value={oncall.site} onChange={(value) => setOncall((o) => ({ ...o, site: value }))} />
          <SelectField label="Shift" value={oncall.shift} onChange={(value) => setOncall((o) => ({ ...o, shift: value }))}>
            <option value="any">Any</option>
            <option value="day">Day</option>
            <option value="night">Night</option>
            <option value="weekend">Weekend</option>
          </SelectField>
        </div>
        <DrawerActions>
          <SecondaryButton type="button" onClick={() => setSheet(null)}>Cancel</SecondaryButton>
          <PrimaryButton type="button" disabled={addOncall.isPending || !oncall.name.trim()} onClick={() => addOncall.mutate()}>
            Add contact
          </PrimaryButton>
        </DrawerActions>
      </Drawer>

      {active ? (
        <Drawer
          wide
          title={`${humanize(active.exposure_type)} · ${active.customer_initials}`}
          description={`Exposed ${active.exposed_at?.slice(0, 16).replace("T", " ") ?? "—"} · triage ${active.triage_band}`}
          onClose={() => setSelected(null)}
        >
          <div data-testid="oh-imm-exposure-visit-link" className="border-b border-dash-border pb-3 text-[13px] text-brand-slate">
            {active.billing_ready || active.visit_linked || active.encounter_uuid ? (
              <>
                Linked to OH visit {String(active.encounter_uuid || active.visit_uuid || "").slice(0, 8)}. Charges bill to
                the visit sales order.
              </>
            ) : (
              <>
                No open OH visit for this employee, so prophylaxis and lab charges are recorded without billing.{" "}
                <Link
                  href={
                    active.customer_uuid
                      ? ROUTES.occupationalHealthEmployee(String(active.customer_uuid))
                      : ROUTES.occupationalHealthEmployees
                  }
                  className="font-medium text-brand-primary hover:underline"
                >
                  Open employee
                </Link>
              </>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-[13px] font-medium text-brand-navy">Record action</p>
            <div className="flex flex-wrap gap-2">
              {INCIDENT_ACTIONS.map(([action, label]) => (
                <SecondaryButton
                  key={action}
                  type="button"
                  className="h-8"
                  onClick={() =>
                    void recordOhImmExposureAction(active.uuid, {
                      action_type: action,
                      consent_captured: action === "consent_exposed" || action === "lab_baseline",
                      performed_by: "OH",
                    })
                      .then(() => {
                        setMsg(`Recorded ${label}.`);
                        refreshIncidents();
                      })
                      .catch((e: Error) => setMsg(e.message))
                  }
                >
                  {label}
                </SecondaryButton>
              ))}
            </div>
          </div>

          {active.source_known === "known" || active.source ? (
            <div className="space-y-2">
              <p className="text-[13px] font-medium text-brand-navy">Source consent</p>
              <div className="flex flex-wrap gap-2">
                <SecondaryButton
                  type="button"
                  className="h-8"
                  onClick={() =>
                    void updateOhImmExposureSource(active.uuid, { consent_status: "given", legal_basis_note: "Consent obtained" })
                      .then(() => setMsg("Source consent: given."))
                      .catch((e: Error) => setMsg(e.message))
                  }
                >
                  Consent given
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  className="h-8"
                  onClick={() =>
                    void updateOhImmExposureSource(active.uuid, { consent_status: "refused" })
                      .then(() => setMsg("Source consent: refused."))
                      .catch((e: Error) => setMsg(e.message))
                  }
                >
                  Refused
                </SecondaryButton>
              </div>
            </div>
          ) : null}

          <ExposureNoteEditor
            key={active.uuid}
            exposureUuid={active.uuid}
            customerUuid={active.customer_uuid}
            onSaved={(message) => {
              setMsg(message);
              refreshIncidents();
            }}
          />

          <div className="space-y-2">
            <p className="text-[13px] font-medium text-brand-navy">Prophylaxis windows</p>
            {(active.clocks ?? []).length === 0 ? (
              <p className="text-[13px] text-dash-muted">No running clocks.</p>
            ) : (
              <div className="space-y-3 rounded-lg border border-dash-border bg-dash-canvas/30 p-3">
                {(active.clocks ?? []).map((clock) => (
                  <ImmClockMeter key={clock.code} clock={clock} exposedAt={active.exposed_at} />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-[13px] font-medium text-brand-navy">Follow-ups</p>
            {(active.followups ?? []).length === 0 ? (
              <p className="text-[13px] text-dash-muted">No follow-ups scheduled.</p>
            ) : (
              <dl className="divide-y divide-dash-border/70 border-y border-dash-border/70 text-[13px]">
                {(active.followups as Array<Record<string, unknown>>).map((followup) => (
                  <div key={String(followup.uuid)} className="flex items-center justify-between gap-3 py-1.5">
                    <dt className="text-brand-navy">
                      {String(followup.label)}
                      <span className="ml-2 text-dash-muted">due {String(followup.due_date)}</span>
                    </dt>
                    <dd>
                      {followup.status !== "done" ? (
                        <ImmRowAction
                          onClick={() =>
                            void completeOhImmExposureFollowup(String(followup.uuid))
                              .then(refreshIncidents)
                              .catch((e: Error) => setMsg(e.message))
                          }
                        >
                          Mark done
                        </ImmRowAction>
                      ) : (
                        <ImmStatusBadge status="done" />
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          <p className="text-[12px] text-dash-muted">
            Billable PEP, HBIG, vaccine, and lab actions need a visit on the incident. Actions without a product are recorded
            without billing.
          </p>
        </Drawer>
      ) : null}
    </>
  );
}

function ExposureNoteEditor({
  exposureUuid,
  customerUuid,
  onSaved,
}: {
  exposureUuid: string;
  customerUuid: string;
  onSaved: (message: string) => void;
}) {
  const [note, setNote] = useState("");
  const [whys, setWhys] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [recall, setRecall] = useState<CopilotResponse | null>(null);

  async function draft() {
    setPending(true);
    setError("");
    try {
      const result = await draftExposureNote(exposureUuid);
      setNote(result.draft.clinical_note ?? "");
      setWhys((result.draft.five_whys ?? []).join("\n"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not draft the note.");
    } finally {
      setPending(false);
    }
  }

  async function save() {
    setPending(true);
    setError("");
    try {
      await acceptExposureNote(exposureUuid, {
        clinical_note: note.trim(),
        five_whys: whys.split("\n").map((line) => line.trim()).filter(Boolean),
      });
      onSaved("Exposure note saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the note.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-brand-navy">Clinical note</p>
        <span className="flex gap-2">
          <SecondaryButton type="button" className="h-8" disabled={pending} onClick={() => void draft()}>
            Draft note
          </SecondaryButton>
          <SecondaryButton
            type="button"
            className="h-8"
            disabled={pending}
            onClick={() =>
              void draftRecall({ customer_uuid: customerUuid, kind: "exposure_followup" })
                .then(setRecall)
                .catch((caught: Error) => setError(caught.message))
            }
          >
            Draft follow-up
          </SecondaryButton>
        </span>
      </div>
      <Textarea rows={4} aria-label="Clinical note" value={note} onChange={(event) => setNote(event.target.value)} />
      <Textarea rows={4} aria-label="Five whys" placeholder="One why per line" value={whys} onChange={(event) => setWhys(event.target.value)} />
      {error ? <p className="text-[13px] text-red-700">{error}</p> : null}
      <PrimaryButton type="button" className="h-8" disabled={pending || note.trim() === ""} onClick={() => void save()}>
        Save note
      </PrimaryButton>
      {recall ? <OhCopilotResult result={recall} /> : null}
    </div>
  );
}
