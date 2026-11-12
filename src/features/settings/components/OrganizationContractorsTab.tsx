"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ListPagePagination } from "@/features/app-shell/components/page-layout";
import { Button } from "@/components/ui/button";
import { AddContractorDialog } from "@/features/settings/components/AddContractorDialog";
import {
  OrganizationEntityRow,
  OrganizationTabPanel,
} from "@/features/settings/components/OrganizationTabContent";
import { UpdateContractorDialog } from "@/features/settings/components/UpdateContractorDialog";
import { SettingsContentSkeleton } from "@/features/settings/components/SettingsContentSkeleton";
import { fetchOrganizationContractorsPage } from "@/features/settings/services/settings.service";
import type { OrganizationContractor } from "@/features/settings/types/settings.types";

const CONTRACTOR_PAGE_SIZE = 10;

type OrganizationContractorsTabProps = {
  isActive: boolean;
};

function contractorMeta(contractor: OrganizationContractor) {
  return [contractor.code, contractor.contact_person, contractor.phone_number]
    .filter((value) => Boolean(value))
    .join(" · ");
}

export function OrganizationContractorsTab({
  isActive,
}: OrganizationContractorsTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [contractors, setContractors] = useState<OrganizationContractor[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingContractor, setEditingContractor] =
    useState<OrganizationContractor | null>(null);

  useEffect(() => {
    if (!isActive || searchParams.get("add") !== "contractor") {
      return;
    }

    setAddDialogOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("add");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [isActive, pathname, router, searchParams]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let active = true;

    async function loadContractors() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchOrganizationContractorsPage({
          page,
          pageSize: CONTRACTOR_PAGE_SIZE,
          includeInactive: true,
        });
        if (active) {
          setContractors(response.results);
          setTotalCount(response.pagination?.count ?? response.results.length);
          setHasNext(Boolean(response.pagination?.next));
          setHasPrevious(Boolean(response.pagination?.previous));
        }
      } catch (loadError) {
        if (active) {
          setContractors([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load contractors.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadContractors();

    return () => {
      active = false;
    };
  }, [isActive, page, reloadToken]);

  if (!isActive) {
    return null;
  }

  function handleCreated(_contractor: OrganizationContractor) {
    setReloadToken((current) => current + 1);
  }

  function handleUpdated(updatedContractor: OrganizationContractor) {
    setContractors((current) =>
      current.map((contractor) =>
        contractor.uuid === updatedContractor.uuid
          ? updatedContractor
          : contractor,
      ),
    );
  }

  return (
    <>
      <OrganizationTabPanel
        description="External companies that supply contracted employees to your organization."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAddDialogOpen(true)}
          >
            Add contractor
          </Button>
        }
      >
        {isLoading ? (
          <SettingsContentSkeleton rows={4} showHeader={false} />
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : contractors.length === 0 ? (
          <p className="text-sm text-slate-400">
            No contractors yet. Add security, catering, or other service providers.
          </p>
        ) : (
          <div className="space-y-4">
            <ul className="divide-y divide-brand-border">
              {contractors.map((contractor) => (
                <OrganizationEntityRow
                  key={contractor.uuid}
                  title={contractor.name}
                  description={contractor.address || undefined}
                  meta={contractorMeta(contractor)}
                  status={contractor.is_active ? "Active" : "Inactive"}
                  actions={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-brand-muted hover:text-brand-navy"
                      onClick={() => setEditingContractor(contractor)}
                    >
                      Update
                    </Button>
                  }
                />
              ))}
            </ul>
            {totalCount > CONTRACTOR_PAGE_SIZE ? (
              <ListPagePagination
                page={page}
                pageSize={CONTRACTOR_PAGE_SIZE}
                totalCount={totalCount}
                hasNext={hasNext}
                hasPrevious={hasPrevious}
                onPageChange={setPage}
              />
            ) : null}
          </div>
        )}
      </OrganizationTabPanel>

      <AddContractorDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onCreated={handleCreated}
      />
      {editingContractor ? (
        <UpdateContractorDialog
          contractor={editingContractor}
          open={Boolean(editingContractor)}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setEditingContractor(null);
            }
          }}
          onUpdated={handleUpdated}
        />
      ) : null}
    </>
  );
}
