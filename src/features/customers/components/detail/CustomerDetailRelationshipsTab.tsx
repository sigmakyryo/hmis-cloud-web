"use client";

import { useCallback, useEffect, useState } from "react";

import { UserIdenticon } from "@/components/UserIdenticon";
import { TabAddActionButton } from "@/components/ui/app-buttons";
import { Button } from "@/components/ui/button";
import { AddCustomerRelationshipDialog } from "@/features/customers/components/detail/AddCustomerRelationshipDialog";
import { CustomerRelationshipsTable } from "@/features/customers/components/detail/CustomerRelationshipsTable";
import { CustomerTabSkeleton } from "@/features/customers/components/detail/CustomerTabSkeleton";
import { CustomerTabActions } from "@/features/customers/components/detail/customer-tab-chrome";
import {
  archiveCustomerRelationship,
  fetchCustomerRelationships,
} from "@/features/customers/services/customer-relationships.service";
import type { CustomerRelationship } from "@/features/customers/types/customer-relationship.types";
import type { Customer } from "@/features/customers/types/customer.types";
import { formatCustomerName } from "@/features/customers/utils/format-customer";
import { BffError } from "@/lib/bff-client";
import { formatBffErrorMessage } from "@/lib/bff-field-errors";
import { useToast } from "@/providers/toast-provider";

type CustomerDetailRelationshipsTabProps = {
  customer: Customer;
  isActive: boolean;
};

export function CustomerDetailRelationshipsTab({
  customer,
  isActive,
}: CustomerDetailRelationshipsTabProps) {
  const { toast } = useToast();
  const [relationships, setRelationships] = useState<CustomerRelationship[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [archivingUuid, setArchivingUuid] = useState<string | null>(null);

  const loadRelationships = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetchCustomerRelationships(customer.uuid);
      setRelationships(response.results ?? []);
      setHasLoaded(true);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Failed to load relationships.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [customer.uuid]);

  useEffect(() => {
    if (!isActive || hasLoaded) {
      return;
    }

    let cancelled = false;

    async function run() {
      await Promise.resolve();
      if (!cancelled) {
        await loadRelationships();
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [hasLoaded, isActive, loadRelationships]);

  async function handleArchive(relationship: CustomerRelationship) {
    setArchivingUuid(relationship.uuid);
    try {
      await archiveCustomerRelationship(customer.uuid, relationship.uuid);
      setRelationships((current) =>
        current.filter((item) => item.uuid !== relationship.uuid),
      );
      toast({
        variant: "success",
        title: "Relationship removed",
        description: "The family link was archived.",
      });
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not remove relationship",
        description:
          error instanceof BffError
            ? formatBffErrorMessage(error.message, error.errors)
            : error instanceof Error
              ? error.message
              : "Try again in a moment.",
      });
    } finally {
      setArchivingUuid(null);
    }
  }

  if (!isActive) {
    return null;
  }

  if (isLoading && !hasLoaded) {
    return <CustomerTabSkeleton />;
  }

  if (loadError && relationships.length === 0) {
    return (
      <div className="space-y-4" data-testid="customer-relationships-tab">
        <p className="text-sm text-red-700">{loadError}</p>
        <Button type="button" variant="outline" onClick={() => void loadRelationships()}>
          Retry
        </Button>
      </div>
    );
  }

  const clientName = formatCustomerName(customer);

  return (
    <div className="space-y-6" data-testid="customer-relationships-tab">
      <CustomerTabActions>
        <TabAddActionButton
          type="button"
          onClick={() => setAddDialogOpen(true)}
          data-testid="add-customer-relationship-button"
        >
          Add relationship
        </TabAddActionButton>
      </CustomerTabActions>

      {relationships.length === 0 ? (
        <div data-testid="customer-relationships-empty">
          <div className="flex items-center gap-3">
            <UserIdenticon
              seed={customer.uuid}
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
          <div className="ml-5 border-l border-dashed border-dash-border py-4 pl-6">
            <h3 className="text-[15px] font-semibold text-brand-navy">
              No relationships yet
            </h3>
            <p className="mt-1 max-w-sm text-[13px] text-dash-muted">
              Link a spouse, child, parent, or sibling. They appear on this
              line under the client.
            </p>
          </div>
        </div>
      ) : (
        <CustomerRelationshipsTable
          clientName={clientName}
          clientSeed={customer.uuid}
          relationships={relationships}
          archivingUuid={archivingUuid}
          onArchive={(row) => void handleArchive(row)}
        />
      )}

      <AddCustomerRelationshipDialog
        customer={customer}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onCreated={(created) => {
          setRelationships((current) => [created, ...current]);
        }}
      />
    </div>
  );
}
