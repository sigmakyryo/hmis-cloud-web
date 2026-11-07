"use client";

import Link from "next/link";

import { UserIdenticon } from "@/components/UserIdenticon";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import {
  CUSTOMER_RELATIONSHIP_LABELS,
  CUSTOMER_RELATIONSHIP_TYPES,
  type CustomerRelationship,
  type CustomerRelationshipType,
} from "@/features/customers/types/customer-relationship.types";

type CustomerRelationshipsTableProps = {
  clientName: string;
  clientSeed: string;
  relationships: CustomerRelationship[];
  archivingUuid: string | null;
  onArchive: (relationship: CustomerRelationship) => void;
};

function formatRelationship(value: string): string {
  return (
    CUSTOMER_RELATIONSHIP_LABELS[value as CustomerRelationshipType] ?? value
  );
}

function linkedClient(relationship: CustomerRelationship) {
  if (relationship.direction === "outgoing") {
    return {
      name: relationship.related_name,
      identifier: relationship.related_identifier,
      uuid: relationship.related_uuid,
    };
  }
  return {
    name: relationship.principal_name,
    identifier: relationship.principal_identifier,
    uuid: relationship.principal_uuid,
  };
}

function groupedRelationships(relationships: CustomerRelationship[]) {
  const groups = new Map<string, CustomerRelationship[]>();
  for (const relationship of relationships) {
    const key = relationship.relationship || "OTHER";
    const current = groups.get(key);
    if (current) {
      current.push(relationship);
    } else {
      groups.set(key, [relationship]);
    }
  }

  return [...groups.entries()].sort(([left], [right]) => {
    const leftIndex = CUSTOMER_RELATIONSHIP_TYPES.indexOf(
      left as CustomerRelationshipType,
    );
    const rightIndex = CUSTOMER_RELATIONSHIP_TYPES.indexOf(
      right as CustomerRelationshipType,
    );
    return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
  });
}

export function CustomerRelationshipsTable({
  clientName,
  clientSeed,
  relationships,
  archivingUuid,
  onArchive,
}: CustomerRelationshipsTableProps) {
  const groups = groupedRelationships(relationships);

  return (
    <div data-testid="customer-relationships-table">
      <div className="flex items-center gap-3">
        <UserIdenticon
          seed={clientSeed}
          name={clientName}
          className="size-11 rounded-lg"
          fallbackClassName="text-sm font-semibold"
        />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-tight text-brand-navy">
            {clientName}
          </p>
          <p className="text-[12px] text-dash-muted">This record</p>
        </div>
      </div>

      <ul className="ml-5 border-l border-dash-border">
        {groups.map(([type, rows]) => (
          <li key={type}>
            <div className="relative py-3 pl-6">
              <span
                className="absolute top-1/2 left-0 w-6 -translate-y-1/2 border-t border-dash-border"
                aria-hidden="true"
              />
              <p className="text-[11px] font-medium tracking-[0.08em] text-brand-primary uppercase">
                {formatRelationship(type)}
              </p>
            </div>
            <ul>
              {rows.map((row) => {
                const other = linkedClient(row);
                const notes = row.notes.trim();
                const isArchiving = archivingUuid === row.uuid;

                return (
                  <li key={row.uuid} className="relative py-2.5 pl-6">
                    <span
                      className="absolute top-1/2 left-0 w-6 -translate-y-1/2 border-t border-dash-border"
                      aria-hidden="true"
                    />
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <UserIdenticon
                          seed={other.uuid || other.name}
                          name={other.name}
                          className="size-9 rounded-lg"
                          fallbackClassName="text-xs font-semibold"
                        />
                        <div className="min-w-0">
                          {other.uuid ? (
                            <Link
                              href={ROUTES.customerDetail(other.uuid)}
                              className="truncate text-[14px] font-medium text-brand-navy hover:text-brand-primary"
                            >
                              {other.name}
                            </Link>
                          ) : (
                            <p className="truncate text-[14px] font-medium text-brand-navy">
                              {other.name}
                            </p>
                          )}
                          <p className="mt-0.5 truncate text-[12px] text-dash-muted">
                            {row.direction === "outgoing"
                              ? "On this record"
                              : "From their record"}
                            {other.identifier ? (
                              <span className="font-mono"> · {other.identifier}</span>
                            ) : null}
                          </p>
                          {notes ? (
                            <p className="mt-1 line-clamp-2 text-[12px] text-brand-slate">
                              {notes}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0 px-2 text-[12px] text-dash-muted hover:text-red-700"
                        disabled={isArchiving}
                        onClick={() => onArchive(row)}
                      >
                        {isArchiving ? "Removing" : "Remove"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
