"use client";

import { ExternalCareDocumentList } from "@/features/clinical-opd/components/tabs/ExternalCareDocumentList";
import { ReferenceRecordForm } from "@/features/clinical-opd/components/tabs/ReferenceRecordForm";
import { TransferRecordForm } from "@/features/clinical-opd/components/tabs/TransferRecordForm";
import {
  useEncounterOutsideHospitals,
  useEncounterReferenceKinds,
  useExternalReferences,
  useExternalTransfers,
} from "@/features/clinical-opd/hooks/use-external-care";
import type { ExternalHospitalTransfer } from "@/features/clinical-opd/types/external-care.types";

type ExternalCareRecordsProps = {
  visitUuid: string;
  encounterUuid: string;
  canWrite: boolean;
  showOutbound: boolean;
};

function TransferRows({
  visitUuid,
  encounterUuid,
  rows,
}: {
  visitUuid: string;
  encounterUuid: string;
  rows: ExternalHospitalTransfer[];
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-dash-muted">None recorded.</p>;
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
            <p className="text-sm text-dash-muted" data-testid={`${row.direction}-transfer-reference`}>
              {row.their_reference}
            </p>
          ) : null}
          <p className="text-sm">{row.reason}</p>
          <ExternalCareDocumentList
            visitUuid={visitUuid}
            encounterUuid={encounterUuid}
            documents={row.documents}
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
        <TransferRows
          visitUuid={visitUuid}
          encounterUuid={encounterUuid}
          rows={inbound}
        />
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
          <TransferRows
            visitUuid={visitUuid}
            encounterUuid={encounterUuid}
            rows={outbound}
          />
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
        {referenceRows.length === 0 ? (
          <p className="text-sm text-dash-muted">None recorded.</p>
        ) : (
          <ul className="space-y-3">
            {referenceRows.map((row) => (
              <li
                key={row.uuid}
                className="rounded-md border border-brand-border px-3 py-2"
              >
                <p className="text-sm font-medium text-brand-navy">
                  {row.kind.label}
                </p>
                <p className="text-sm">{row.value}</p>
                {row.hospital ? (
                  <p className="text-sm text-dash-muted">{row.hospital.name}</p>
                ) : null}
                <ExternalCareDocumentList
                  visitUuid={visitUuid}
                  encounterUuid={encounterUuid}
                  documents={row.documents}
                />
              </li>
            ))}
          </ul>
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
