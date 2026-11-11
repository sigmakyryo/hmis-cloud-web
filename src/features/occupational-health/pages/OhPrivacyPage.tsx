"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import { ImmPrimaryCell, ImmRecordTable, ImmRowAction, ImmStatusBadge } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmNotice, ImmTabsBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { errorText, fmtDate, isForbidden } from "@/app/(app)/drug-alcohol/_components/shared/da-format";
import { DaCell, DaRow } from "@/app/(app)/drug-alcohol/_components/shared/da-ui";
import { fetchCustomers } from "@/features/customers/services/customers.service";
import {
  CONSENT_PURPOSE_LABEL,
  DSR_KIND_LABEL,
  anonymiseDsr,
  closeDsr,
  decideDsr,
  exportDsr,
  fetchConsents,
  fetchDsrs,
  openDsr,
  recordConsent,
  withdrawConsent,
  type AnonymiseResult,
  type ConsentMethod,
  type ConsentPurpose,
  type DataSubjectRequest,
  type DsrKind,
  type DsrStatus,
} from "@/features/occupational-health/services/oh-privacy.service";
import { useToast } from "@/providers/toast-provider";

type Tab = "requests" | "consent";
const field = "h-9 w-full rounded-md border border-dash-border px-2.5 text-[13px]";
const STATUS_BADGE: Record<DsrStatus, string> = { received: "pending", approved: "planned", rejected: "overdue", completed: "cleared" };

type Person = { uuid: string; name: string };

function PersonPicker({ value, onChange }: { value: Person | null; onChange: (p: Person | null) => void }) {
  const [search, setSearch] = useState("");
  const found = useQuery({
    queryKey: ["customers", "privacy-pick", search],
    queryFn: () => fetchCustomers({ search, pageSize: 8 }),
    enabled: search.trim().length >= 2,
    retry: false,
  });
  if (value) {
    return (
      <div className="flex items-center justify-between rounded-md border border-dash-border px-2.5 py-2 text-[13px]">
        <span data-testid="privacy-person">{value.name}</span>
        <button type="button" className="text-primary hover:underline" onClick={() => onChange(null)}>
          Change
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <input aria-label="Find worker" placeholder="Find a worker by name or number" className={field} value={search} onChange={(e) => setSearch(e.target.value)} />
      {(found.data?.results ?? []).map((c) => (
        <button key={c.uuid} type="button" className="block w-full rounded px-2 py-1 text-left text-[13px] hover:bg-dash-canvas" onClick={() => onChange({ uuid: c.uuid, name: c.full_name })}>
          {c.full_name}
        </button>
      ))}
    </div>
  );
}

function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function OhPrivacyPage() {
  const [tab, setTab] = useState<Tab>("requests");
  return (
    <ImmPageShell title="Privacy" testId="oh-privacy-page">
      <ImmTabsBar
        label="Privacy views"
        tabs={[
          { key: "requests", label: "Data-subject requests" },
          { key: "consent", label: "Consent" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "requests" ? <RequestsView /> : <ConsentView />}
    </ImmPageShell>
  );
}

function RequestsView() {
  const { toast } = useToast();
  const client = useQueryClient();
  const [status, setStatus] = useState<DsrStatus | "">("");
  const [opening, setOpening] = useState(false);
  const [deciding, setDeciding] = useState<DataSubjectRequest | null>(null);
  const [anonymising, setAnonymising] = useState<DataSubjectRequest | null>(null);
  const list = useQuery({ queryKey: ["oh-privacy", "requests", status], queryFn: () => fetchDsrs(status || undefined), retry: false });
  const refresh = () => void client.invalidateQueries({ queryKey: ["oh-privacy", "requests"] });
  const exporter = useMutation({
    mutationFn: (r: DataSubjectRequest) => exportDsr(r.uuid),
    onSuccess: (data, r) => {
      downloadJson(`personal-data-${r.uuid}.json`, data);
      refresh();
    },
    onError: (error) => toast({ variant: "error", title: "Export failed", description: errorText(error) }),
  });
  const closer = useMutation({
    mutationFn: (r: DataSubjectRequest) => closeDsr(r.uuid, "Handled by staff"),
    onSuccess: refresh,
    onError: (error) => toast({ variant: "error", title: "Not closed", description: errorText(error) }),
  });

  return (
    <div className="space-y-3 pt-3" data-testid="oh-dsr-view">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <select aria-label="Status" className={`${field} w-48`} value={status} onChange={(e) => setStatus(e.target.value as DsrStatus | "")}>
          <option value="">All statuses</option>
          <option value="received">Waiting for decision</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
        <PageActionButton onClick={() => setOpening(true)}>Log a request</PageActionButton>
      </div>
      {list.isLoading ? <QuietLoading /> : null}
      {list.isError ? (
        <LoadError>{isForbidden(list.error) ? "Only an administrator can handle data-subject requests." : errorText(list.error, "Could not load requests.")}</LoadError>
      ) : null}
      {list.isSuccess && list.data.length === 0 ? <ImmNotice>No requests.</ImmNotice> : null}
      {list.isSuccess && list.data.length > 0 ? (
        <ImmRecordTable columns={["Request", "Logged", "Due", "Status", "Actions"]}>
          {list.data.map((r) => (
            <DaRow key={r.uuid} testId="oh-dsr-row">
              <DaCell first>
                <ImmPrimaryCell title={DSR_KIND_LABEL[r.kind]} detail={r.details || r.customer_uuid} />
              </DaCell>
              <DaCell>
                {fmtDate(r.created_at)} {r.requested_by_name ? `· ${r.requested_by_name}` : ""}
              </DaCell>
              <DaCell>
                {fmtDate(r.due_on)} {r.overdue ? <span className="text-red-600">overdue</span> : null}
              </DaCell>
              <DaCell>
                <ImmStatusBadge status={STATUS_BADGE[r.status]} label={r.status} />
              </DaCell>
              <DaCell actions>
                {r.status === "received" ? <ImmRowAction onClick={() => setDeciding(r)}>Decide</ImmRowAction> : null}
                {r.status !== "received" && r.status !== "rejected" && (r.kind === "access" || r.kind === "portability") ? (
                  <ImmRowAction disabled={exporter.isPending} onClick={() => exporter.mutate(r)}>
                    Download data
                  </ImmRowAction>
                ) : null}
                {r.status === "approved" && r.kind === "erasure" ? <ImmRowAction onClick={() => setAnonymising(r)}>Anonymise</ImmRowAction> : null}
                {r.status === "approved" && ["rectification", "restriction", "objection"].includes(r.kind) ? (
                  <ImmRowAction disabled={closer.isPending} onClick={() => closer.mutate(r)}>
                    Mark done
                  </ImmRowAction>
                ) : null}
              </DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      ) : null}
      {opening ? <OpenRequestDrawer onClose={() => setOpening(false)} onDone={refresh} /> : null}
      {deciding ? <DecideDrawer request={deciding} onClose={() => setDeciding(null)} onDone={refresh} /> : null}
      {anonymising ? <AnonymiseDrawer request={anonymising} onClose={() => setAnonymising(null)} onDone={refresh} /> : null}
    </div>
  );
}

function OpenRequestDrawer({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [person, setPerson] = useState<Person | null>(null);
  const [kind, setKind] = useState<DsrKind>("access");
  const [channel, setChannel] = useState("in_person");
  const [identity, setIdentity] = useState("");
  const [details, setDetails] = useState("");
  const save = useMutation({
    mutationFn: () => {
      if (!person) throw new Error("Choose the worker.");
      if (identity.trim().length < 3) throw new Error("Record how you checked their identity.");
      return openDsr({ customer_uuid: person.uuid, kind, channel, identity_check: identity.trim(), details: details.trim() || undefined });
    },
    onSuccess: () => {
      toast({ variant: "success", title: "Request logged", description: "A second administrator must approve it." });
      onDone();
      onClose();
    },
    onError: (error) => toast({ variant: "error", title: "Not logged", description: errorText(error) }),
  });
  return (
    <Drawer title="Log a data-subject request" description="The person asking about their own OH data" onClose={onClose}>
      <div className="space-y-3 text-[13px]">
        <PersonPicker value={person} onChange={setPerson} />
        <label className="block space-y-1">
          <span className="text-dash-muted">What they ask for</span>
          <select aria-label="Request kind" className={field} value={kind} onChange={(e) => setKind(e.target.value as DsrKind)}>
            {(Object.keys(DSR_KIND_LABEL) as DsrKind[]).map((k) => (
              <option key={k} value={k}>
                {DSR_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-dash-muted">Received by</span>
          <select aria-label="Channel" className={field} value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="in_person">In person</option>
            <option value="email">Email</option>
            <option value="letter">Letter</option>
            <option value="phone">Phone</option>
            <option value="portal">Portal</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-dash-muted">Identity check</span>
          <input aria-label="Identity check" placeholder="e.g. National ID seen" className={field} value={identity} onChange={(e) => setIdentity(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-dash-muted">Details</span>
          <textarea aria-label="Details" rows={3} className="w-full rounded-md border border-dash-border p-2.5" value={details} onChange={(e) => setDetails(e.target.value)} />
        </label>
        {kind === "erasure" ? (
          <ImmNotice tone="warning">Erasure replaces the identity details OHS holds. Clinical records are kept, and the client record in the main system is not changed.</ImmNotice>
        ) : null}
        <DrawerActions>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PageActionButton disabled={save.isPending} onClick={() => save.mutate()}>
            Log request
          </PageActionButton>
        </DrawerActions>
      </div>
    </Drawer>
  );
}

function DecideDrawer({ request, onClose, onDone }: { request: DataSubjectRequest; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const decide = useMutation({
    mutationFn: (d: "approve" | "reject") => decideDsr(request.uuid, d, note.trim()),
    onSuccess: () => {
      toast({ variant: "success", title: "Decision saved" });
      onDone();
      onClose();
    },
    onError: (error) => toast({ variant: "error", title: "Not saved", description: errorText(error) }),
  });
  return (
    <Drawer title={DSR_KIND_LABEL[request.kind]} description={`Identity: ${request.identity_check}`} onClose={onClose}>
      <div className="space-y-3 text-[13px]">
        <p>{request.details || "No details given."}</p>
        <p className="text-dash-muted">The administrator who logged a request cannot decide it.</p>
        <label className="block space-y-1">
          <span className="text-dash-muted">Note (required to reject)</span>
          <textarea aria-label="Decision note" rows={3} className="w-full rounded-md border border-dash-border p-2.5" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <DrawerActions>
          <SecondaryButton disabled={decide.isPending} onClick={() => decide.mutate("reject")}>
            Reject
          </SecondaryButton>
          <PageActionButton disabled={decide.isPending} onClick={() => decide.mutate("approve")}>
            Approve
          </PageActionButton>
        </DrawerActions>
      </div>
    </Drawer>
  );
}

function AnonymiseDrawer({ request, onClose, onDone }: { request: DataSubjectRequest; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [confirm, setConfirm] = useState("");
  const preview = useQuery({ queryKey: ["oh-privacy", "anonymise-preview", request.uuid], queryFn: () => anonymiseDsr(request.uuid, false), retry: false });
  const apply = useMutation({
    mutationFn: () => anonymiseDsr(request.uuid, true),
    onSuccess: () => {
      toast({ variant: "success", title: "Identity details anonymised" });
      onDone();
      onClose();
    },
    onError: (error) => toast({ variant: "error", title: "Not anonymised", description: errorText(error) }),
  });
  const counts: AnonymiseResult["would_anonymise"] = preview.data?.would_anonymise ?? {};
  return (
    <Drawer title="Anonymise identity details" description="Preview first. Nothing is deleted." onClose={onClose}>
      <div className="space-y-3 text-[13px]" data-testid="oh-dsr-anonymise">
        {preview.isLoading ? <QuietLoading /> : null}
        {preview.isError ? <LoadError>{errorText(preview.error, "Could not preview.")}</LoadError> : null}
        {preview.isSuccess ? (
          <>
            <ul className="list-disc pl-5">
              {Object.entries(counts).map(([k, n]) => (
                <li key={k}>
                  {k}: {n} record{n === 1 ? "" : "s"}
                </li>
              ))}
            </ul>
            <p className="text-dash-muted">{preview.data.kept}</p>
            <label className="block space-y-1">
              <span className="text-dash-muted">Type ANONYMISE to confirm</span>
              <input aria-label="Confirm anonymise" className={field} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </label>
          </>
        ) : null}
        <DrawerActions>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PageActionButton disabled={confirm !== "ANONYMISE" || apply.isPending} onClick={() => apply.mutate()}>
            Anonymise
          </PageActionButton>
        </DrawerActions>
      </div>
    </Drawer>
  );
}

function ConsentView() {
  const { toast } = useToast();
  const client = useQueryClient();
  const [person, setPerson] = useState<Person | null>(null);
  const [purpose, setPurpose] = useState<ConsentPurpose>("oh_assessment");
  const [method, setMethod] = useState<ConsentMethod>("paper");
  const [notice, setNotice] = useState("");
  const list = useQuery({ queryKey: ["oh-privacy", "consents", person?.uuid], queryFn: () => fetchConsents(person!.uuid), enabled: Boolean(person), retry: false });
  const refresh = () => void client.invalidateQueries({ queryKey: ["oh-privacy", "consents"] });
  const record = useMutation({
    mutationFn: () => recordConsent(person!.uuid, { purpose, method, notice_version: notice.trim() || undefined }),
    onSuccess: () => {
      toast({ variant: "success", title: "Consent recorded" });
      refresh();
    },
    onError: (error) => toast({ variant: "error", title: "Not recorded", description: errorText(error) }),
  });
  const withdraw = useMutation({
    mutationFn: (uuid: string) => {
      const reason = window.prompt("Why is consent withdrawn?") ?? "";
      if (reason.trim().length < 3) throw new Error("Give a reason.");
      return withdrawConsent(uuid, reason.trim());
    },
    onSuccess: refresh,
    onError: (error) => toast({ variant: "error", title: "Not withdrawn", description: errorText(error) }),
  });

  return (
    <div className="max-w-3xl space-y-4 px-1 pt-3 text-[13px]" data-testid="oh-consent-view">
      <PersonPicker value={person} onChange={setPerson} />
      {person ? (
        <>
          <div className="grid gap-2 sm:grid-cols-4">
            <select aria-label="Purpose" className={`${field} sm:col-span-2`} value={purpose} onChange={(e) => setPurpose(e.target.value as ConsentPurpose)}>
              {(Object.keys(CONSENT_PURPOSE_LABEL) as ConsentPurpose[]).map((p) => (
                <option key={p} value={p}>
                  {CONSENT_PURPOSE_LABEL[p]}
                </option>
              ))}
            </select>
            <select aria-label="Method" className={field} value={method} onChange={(e) => setMethod(e.target.value as ConsentMethod)}>
              <option value="paper">Signed form</option>
              <option value="electronic">Electronic</option>
              <option value="verbal_witnessed">Verbal, witnessed</option>
            </select>
            <input aria-label="Notice version" placeholder="Notice version" className={field} value={notice} onChange={(e) => setNotice(e.target.value)} />
          </div>
          <SecondaryButton disabled={record.isPending} onClick={() => record.mutate()}>
            Record consent
          </SecondaryButton>
          {list.isLoading ? <QuietLoading /> : null}
          {list.isError ? <LoadError>{errorText(list.error, "Could not load consent.")}</LoadError> : null}
          {list.isSuccess && list.data.length === 0 ? <ImmNotice>No consent on file.</ImmNotice> : null}
          {list.isSuccess && list.data.length > 0 ? (
            <ImmRecordTable columns={["Purpose", "Status", "Recorded", "Actions"]}>
              {list.data.map((c) => (
                <DaRow key={c.uuid} testId="oh-consent-row">
                  <DaCell first>
                    <ImmPrimaryCell title={CONSENT_PURPOSE_LABEL[c.purpose] ?? c.purpose} detail={c.withdraw_reason || c.notice_version || undefined} />
                  </DaCell>
                  <DaCell>
                    <ImmStatusBadge status={c.status === "granted" ? "cleared" : "overdue"} label={c.status} />
                  </DaCell>
                  <DaCell>
                    {fmtDate(c.granted_at)} · {c.method} {c.recorded_by_name ? `· ${c.recorded_by_name}` : ""}
                  </DaCell>
                  <DaCell actions>
                    {c.status === "granted" ? (
                      <ImmRowAction disabled={withdraw.isPending} onClick={() => withdraw.mutate(c.uuid)}>
                        Withdraw
                      </ImmRowAction>
                    ) : null}
                  </DaCell>
                </DaRow>
              ))}
            </ImmRecordTable>
          ) : null}
        </>
      ) : (
        <p className="text-dash-muted">Find a worker to see and record their consent.</p>
      )}
    </div>
  );
}
