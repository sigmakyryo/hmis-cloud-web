"use client";

import { SecondaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalCareDocumentList } from "@/features/clinical-opd/components/tabs/ExternalCareDocumentList";
import { ReferenceRecordForm } from "@/features/clinical-opd/components/tabs/ReferenceRecordForm";
import { TransferRecordForm } from "@/features/clinical-opd/components/tabs/TransferRecordForm";
import {
  useArchiveExternalReference,
  useArchiveExternalTransfer,
  useEncounterOutsideHospitals,
  useEncounterReferenceKinds,
  useExternalReferences,
  useExternalTransfers,
  useUploadExternalReferenceDocument,
  useUploadExternalTransferDocument,
} from "@/features/clinical-opd/hooks/use-external-care";
import type {
  ExternalHospitalTransfer,
  ExternalReference,
} from "@/features/clinical-opd/types/external-care.types";
import { BffError } from "@/lib/bff-client";
import { formatBffErrorMessage } from "@/lib/bff-field-errors";
import { useToast } from "@/providers/toast-provider";

type ExternalCareRecordsProps = {
  visitUuid: string;
  encounterUuid: string;
  canWrite: boolean;
  showOutbound: boolean;
};

function RecordActions({
  canWrite,
  pending,
  inputId,
  onRemove,
  onFile,
}: {
  canWrite: boolean;
  pending: boolean;
  inputId: string;
  onRemove: () => void;
  onFile: (file: File) => void;
}) {
  if (!canWrite) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Label htmlFor={inputId} className="sr-only">
        Add document
      </Label>
      <Input
        id={inputId}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        disabled={pending}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
      <SecondaryButton type="button" disabled={pending} onClick={onRemove}>
        Remove
      </SecondaryButton>
    </div>
  );
}

function TransferRows({
  visitUuid,
  encounterUuid,
  rows,
  canWrite,
}: {
  visitUuid: string;
  encounterUuid: string;
  rows: ExternalHospitalTransfer[];
  canWrite: boolean;
}) {
  const { toast } = useToast();
  const archive = useArchiveExternalTransfer(visitUuid, encounterUuid);
  const upload = useUploadExternalTransferDocument(visitUuid, encounterUuid);
  if (rows.length === 0) {
    return <p className="text-sm text-dash-muted">None recorded.</p>;
  }

  async function remove(transferUuid: string) {
    try {
      await archive.mutateAsync(transferUuid);
    } catch (error) {
      toast({
        title: "Could not remove the transfer",
        description:
          error instanceof BffError
            ? formatBffErrorMessage(error.message, error.errors)
            : "Try again.",
        variant: "error",
      });
    }
  }

  async function addFile(transferUuid: string, file: File) {
    try {
      await upload.mutateAsync({ transferUuid, file });
    } catch (error) {
      toast({
        title: "Could not attach the document",
        description:
          error instanceof BffError
            ? formatBffErrorMessage(error.message, error.errors)
            : "Try again.",
        variant: "error",
      });
    }
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li
          key={row.uuid}
          className="rounded-md border border-brand-border px-3 py-2"
          data-testid={`${row.direction}-transfer-row`}
        >
          <p className="text-sm font-medium text-brand-navy">{row.hospital.name}</p>
          {row.their_reference ? (
            <p
              className="text-sm text-dash-muted"
              data-testid={`${row.direction}-transfer-reference`}
            >
              {row.their_reference}
            </p>
          ) : null}
          <p className="text-sm">{row.reason}</p>
          <ExternalCareDocumentList
            visitUuid={visitUuid}
            encounterUuid={encounterUuid}
            documents={row.documents}
          />
          <RecordActions
            canWrite={canWrite}
            pending={archive.isPending || upload.isPending}
            inputId={`transfer-file-${row.uuid}`}
            onRemove={() => void remove(row.uuid)}
            onFile={(file) => void addFile(row.uuid, file)}
          />
        </li>
      ))}
    </ul>
  );
}

function ReferenceRows({
  visitUuid,
  encounterUuid,
  rows,
  canWrite,
}: {
  visitUuid: string;
  encounterUuid: string;
  rows: ExternalReference[];
  canWrite: boolean;
}) {
  const { toast } = useToast();
  const archive = useArchiveExternalReference(visitUuid, encounterUuid);
  const upload = useUploadExternalReferenceDocument(visitUuid, encounterUuid);

  async function remove(referenceUuid: string) {
    try {
      await archive.mutateAsync(referenceUuid);
    } catch (error) {
      toast({
        title: "Could not remove the reference",
        description:
          error instanceof BffError
            ? formatBffErrorMessage(error.message, error.errors)
            : "Try again.",
        variant: "error",
      });
    }
  }

  async function addFile(referenceUuid: string, file: File) {
    try {
      await upload.mutateAsync({ referenceUuid, file });
    } catch (error) {
      toast({
        title: "Could not attach the document",
        description:
          error instanceof BffError
            ? formatBffErrorMessage(error.message, error.errors)
            : "Try again.",
        variant: "error",
      });
    }
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.uuid} className="rounded-md border border-brand-border px-3 py-2">
          <p className="text-sm font-medium text-brand-navy">{row.kind.label}</p>
          <p className="text-sm">{row.value}</p>
          {row.hospital ? (
            <p className="text-sm text-dash-muted">{row.hospital.name}</p>
          ) : null}
          <ExternalCareDocumentList
            visitUuid={visitUuid}
            encounterUuid={encounterUuid}
            documents={row.documents}
          />
          <RecordActions
            canWrite={canWrite}
            pending={archive.isPending || upload.isPending}
            inputId={`reference-file-${row.uuid}`}
            onRemove={() => void remove(row.uuid)}
            onFile={(file) => void addFile(row.uuid, file)}
          />
        </li>
      ))}
    </ul>
  );
}

export function ExternalCareRecords({
  visitUuid,
  encounterUuid,
  canWrite,
  showOutbound,
}: ExternalCareRecordsProps) {
  const hospitals = useEncounterOutsideHospitals(visitUuid, encounterUuid);
  const transfers = useExternalTransfers(visitUuid, encounterUuid);
  const references = useExternalReferences(visitUuid, encounterUuid);
  const kinds = useEncounterReferenceKinds(visitUuid, encounterUuid);
  const hospitalRows = hospitals.data ?? [];
  const transferRows = transfers.data ?? [];
  const inbound = transferRows.filter((row) => row.direction === "inbound");
  const outbound = transferRows.filter((row) => row.direction === "outbound");
  const referenceRows = references.data ?? [];
  const kindRows = kinds.data ?? [];

  return (
    <div className="space-y-8">
      <section className="space-y-3" data-testid="external-care-inbound">
        <div>
          <h3 className="text-sm font-semibold text-brand-navy">
            Came from another hospital
          </h3>
          <p className="mt-1 text-sm text-dash-muted">
            Record where this attendance started, if they were sent to us.
          </p>
        </div>
        {transfers.isLoading ? (
          <p className="text-sm text-dash-muted">Loading…</p>
        ) : transfers.isError ? (
          <p className="text-sm text-dash-muted">Could not load these records.</p>
        ) : (
          <TransferRows
            visitUuid={visitUuid}
            encounterUuid={encounterUuid}
            rows={inbound}
            canWrite={canWrite}
          />
        )}
        {canWrite ? (
          <TransferRecordForm
            visitUuid={visitUuid}
            encounterUuid={encounterUuid}
            direction="inbound"
            hospitals={hospitalRows}
            disabled={hospitals.isLoading}
          />
        ) : null}
      </section>

      {showOutbound ? (
        <section className="space-y-3" data-testid="external-care-outbound">
          <div>
            <h3 className="text-sm font-semibold text-brand-navy">
              Sent to another hospital
            </h3>
            <p className="mt-1 text-sm text-dash-muted">
              Saving this sets the outcome to referred.
            </p>
          </div>
          {transfers.isLoading ? (
            <p className="text-sm text-dash-muted">Loading…</p>
          ) : transfers.isError ? (
            <p className="text-sm text-dash-muted">Could not load these records.</p>
          ) : (
            <TransferRows
              visitUuid={visitUuid}
              encounterUuid={encounterUuid}
              rows={outbound}
              canWrite={canWrite}
            />
          )}
          {canWrite ? (
            <TransferRecordForm
              visitUuid={visitUuid}
              encounterUuid={encounterUuid}
              direction="outbound"
              hospitals={hospitalRows}
              disabled={hospitals.isLoading}
            />
          ) : null}
        </section>
      ) : null}

      <section className="space-y-3" data-testid="external-care-references">
        <div>
          <h3 className="text-sm font-semibold text-brand-navy">References</h3>
          <p className="mt-1 text-sm text-dash-muted">
            Numbers this clinic quotes from somewhere else.
          </p>
        </div>
        {references.isLoading ? (
          <p className="text-sm text-dash-muted">Loading…</p>
        ) : references.isError ? (
          <p className="text-sm text-dash-muted">Could not load these records.</p>
        ) : referenceRows.length === 0 ? (
          <p className="text-sm text-dash-muted">None recorded.</p>
        ) : (
          <ReferenceRows
            visitUuid={visitUuid}
            encounterUuid={encounterUuid}
            rows={referenceRows}
            canWrite={canWrite}
          />
        )}
        {canWrite ? (
          <ReferenceRecordForm
            visitUuid={visitUuid}
            encounterUuid={encounterUuid}
            hospitals={hospitalRows}
            kinds={kindRows}
            disabled={kinds.isLoading}
          />
        ) : null}
      </section>
    </div>
  );
}
