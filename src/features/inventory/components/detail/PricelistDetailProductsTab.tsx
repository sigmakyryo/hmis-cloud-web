"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  DestructiveButton,
  PageActionButton,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui/app-buttons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchCatalogPricelistProducts,
  fetchPricelistProductSummaryStats,
  removeCatalogPricelistProduct,
  updateCatalogPricelistProduct,
  type PricelistProductSummaryStats,
} from "@/features/catalog/services/catalog.service";
import type {
  CatalogPricelist,
  CatalogPricelistMembership,
} from "@/features/catalog/types/catalog.types";
import {
  ListPagePagination,
  ListPageSearchToolbar,
  ListPageStatsSection,
} from "@/features/app-shell/components/page-layout";
import { fetchInsuranceSchemes } from "@/features/customers/services/insurance-schemes.service";
import { AddPricelistProductDialog } from "@/features/inventory/components/detail/AddPricelistProductDialog";
import { CopyPricelistProductsDialog } from "@/features/inventory/components/detail/CopyPricelistProductsDialog";
import { EditPricelistProductNameDialog } from "@/features/inventory/components/detail/EditPricelistProductNameDialog";
import { PricelistCopyJobPanel } from "@/features/inventory/components/detail/PricelistCopyJobPanel";
import { PricelistProductSummaryStatsCards } from "@/features/inventory/components/detail/PricelistProductSummaryStatsCards";
import { PricelistProductsTable } from "@/features/inventory/components/detail/PricelistProductsTable";
import { PricelistProductsTableSkeleton } from "@/features/inventory/components/detail/PricelistProductsTableSkeleton";
import { ProductTariffCodeDialog } from "@/features/inventory/components/detail/ProductTariffCodeDialog";
import { fetchProductTariffCodes } from "@/features/inventory/services/inventory.service";
import type { ProductTariffCode } from "@/features/inventory/types/inventory.types";
import { BffError } from "@/lib/bff-client";
import { formatBffErrorMessage } from "@/lib/bff-field-errors";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import { useUser } from "@/providers/user-provider";

const PRODUCTS_PAGE_SIZE = 25;

type PricelistDetailProductsTabProps = {
  pricelist: CatalogPricelist;
  isActive: boolean;
};

type PendingPriceEdit = {
  item: CatalogPricelistMembership;
  value: string;
};

export function PricelistDetailProductsTab({
  pricelist,
  isActive,
}: PricelistDetailProductsTabProps) {
  const { toast } = useToast();
  const { userData } = useUser();
  const isTenantAdmin = Boolean(userData?.is_admin);
  const [items, setItems] = useState<CatalogPricelistMembership[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [activeCopyJobUuid, setActiveCopyJobUuid] = useState<string | null>(null);
  const [activeCopyToastId, setActiveCopyToastId] = useState<string | number | null>(
    null,
  );
  const [priceEdit, setPriceEdit] = useState<PendingPriceEdit | null>(null);
  const [nameEditItem, setNameEditItem] =
    useState<CatalogPricelistMembership | null>(null);
  const [pendingRemove, setPendingRemove] = useState<CatalogPricelistMembership | null>(
    null,
  );
  const [tariffDialog, setTariffDialog] = useState<{
    productUuid: string;
    existingCodes: ProductTariffCode[];
    editingCode: ProductTariffCode | null;
    preferredSchemeUuid: string | null;
  } | null>(null);
  const [isOpeningTariff, setIsOpeningTariff] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState<PricelistProductSummaryStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const summary = await fetchPricelistProductSummaryStats(pricelist.uuid);
      setStats(summary);
    } catch {
      setStats(null);
    } finally {
      setIsStatsLoading(false);
    }
  }, [pricelist.uuid]);

  const loadItems = useCallback(
    async (options?: { silent?: boolean; page?: number; search?: string }) => {
      const nextPage = options?.page ?? page;
      const nextSearch = options?.search ?? appliedSearch;
      if (!options?.silent) {
        setIsLoading(true);
      }
      try {
        setError(null);
        const response = await fetchCatalogPricelistProducts(pricelist.uuid, {
          page: nextPage,
          pageSize: PRODUCTS_PAGE_SIZE,
          search: nextSearch || undefined,
        });
        setItems(response.results);
        const count = response.pagination?.count ?? response.results.length;
        setTotalCount(count);
        setHasNext(Boolean(response.pagination?.next));
        setHasPrevious(Boolean(response.pagination?.previous) || nextPage > 1);
        setPage(nextPage);
        setAppliedSearch(nextSearch);
      } catch (err) {
        setItems([]);
        setTotalCount(0);
        setHasNext(false);
        setHasPrevious(false);
        setError(err instanceof Error ? err.message : "Failed to load products.");
      } finally {
        if (!options?.silent) {
          setIsLoading(false);
        }
        setHasLoaded(true);
      }
    },
    [appliedSearch, page, pricelist.uuid],
  );

  useEffect(() => {
    if (!isActive) {
      return;
    }
    setSearch("");
    setAppliedSearch("");
    void loadItems({ page: 1, search: "" });
    void loadStats();
  }, [isActive, pricelist.uuid]); // eslint-disable-line react-hooks/exhaustive-deps -- reset when tab/pricelist changes

  function handleSearchSubmit() {
    const nextSearch = search.trim();
    setSearch(nextSearch);
    void loadItems({ page: 1, search: nextSearch });
  }

  function handleClearSearch() {
    setSearch("");
    void loadItems({ page: 1, search: "" });
  }

  async function handleUpdatePrice() {
    if (!priceEdit?.item.product_uuid) {
      return;
    }

    const parsedPrice = Number(priceEdit.value);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      toast({
        variant: "error",
        title: "Invalid price",
        description: "Enter a fixed price of zero or greater.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateCatalogPricelistProduct(
        pricelist.uuid,
        priceEdit.item.product_uuid,
        { fixed_price: parsedPrice },
      );
      toast({
        variant: "success",
        title: result.approval_required
          ? "Price change submitted for approval"
          : "Price updated",
        description: result.approval_required
          ? "A second approver must confirm this change before it takes effect."
          : "The fixed price was saved.",
      });
      setPriceEdit(null);
      await Promise.all([
        loadItems({ silent: true, page }),
        loadStats(),
      ]);
    } catch (err) {
      toast({
        variant: "error",
        title: "Could not update price",
        description:
          err instanceof BffError
            ? formatBffErrorMessage(err.message, err.errors)
            : err instanceof Error
              ? err.message
              : "Something went wrong.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEditTariffCode(item: CatalogPricelistMembership) {
    if (isOpeningTariff) {
      return;
    }
    setIsOpeningTariff(true);
    try {
      const [codes, schemes] = await Promise.all([
        fetchProductTariffCodes(item.product_uuid),
        fetchInsuranceSchemes(),
      ]);
      const preferredScheme =
        typeof pricelist.id === "number"
          ? schemes.find((scheme) => scheme.pricelist_id === pricelist.id) ?? null
          : null;
      const preferredCode = preferredScheme
        ? codes.find((code) => code.scheme_uuid === preferredScheme.uuid) ?? null
        : null;
      setTariffDialog({
        productUuid: item.product_uuid,
        existingCodes: codes,
        editingCode: preferredCode ?? codes[0] ?? null,
        preferredSchemeUuid: preferredScheme?.uuid ?? null,
      });
    } catch (err) {
      toast({
        variant: "error",
        title: "Could not load tariff codes",
        description:
          err instanceof BffError
            ? formatBffErrorMessage(err.message, err.errors)
            : err instanceof Error
              ? err.message
              : "Something went wrong.",
      });
    } finally {
      setIsOpeningTariff(false);
    }
  }

  async function handleRemove() {
    if (!pendingRemove?.product_uuid) {
      return;
    }

    setIsSaving(true);
    try {
      const result = await removeCatalogPricelistProduct(
        pricelist.uuid,
        pendingRemove.product_uuid,
      );
      const approvalRequired = Boolean(result?.approval_required);
      toast({
        variant: "success",
        title: approvalRequired
          ? "Removal submitted for approval"
          : "Product removed",
        description: approvalRequired
          ? "A second approver must confirm this change before it takes effect."
          : "This product was removed from the pricelist.",
      });
      setPendingRemove(null);
      const nextPage =
        items.length <= 1 && page > 1 ? page - 1 : page;
      await Promise.all([
        loadItems({ silent: true, page: nextPage }),
        loadStats(),
      ]);
    } catch (err) {
      toast({
        variant: "error",
        title: "Could not remove product",
        description:
          err instanceof BffError
            ? formatBffErrorMessage(err.message, err.errors)
            : err instanceof Error
              ? err.message
              : "Something went wrong.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (!isActive) {
    return null;
  }

  const showInitialLoader = isLoading && !hasLoaded;

  if (showInitialLoader) {
    return (
      <div className="space-y-4" data-testid="pricelist-products-tab-skeleton">
        <ListPageStatsSection>
          <PricelistProductSummaryStatsCards stats={null} isLoading />
        </ListPageStatsSection>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-56 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-9 w-28 animate-pulse rounded-full bg-slate-100" />
        </div>
        <PricelistProductsTableSkeleton showActions={isTenantAdmin} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p>{error}</p>
        <SecondaryButton type="button" className="mt-4" onClick={() => void loadItems()}>
          Try again
        </SecondaryButton>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="pricelist-products-tab">
      {activeCopyJobUuid ? (
        <PricelistCopyJobPanel
          targetPricelistUuid={pricelist.uuid}
          jobUuid={activeCopyJobUuid}
          copyToastId={activeCopyToastId ?? undefined}
          onTerminal={(job) => {
            void loadItems({ silent: true, page: 1 });
            void loadStats();
            if (job.status === "completed") {
              setActiveCopyJobUuid(null);
              setActiveCopyToastId(null);
            }
          }}
          onDismiss={() => {
            setActiveCopyJobUuid(null);
            setActiveCopyToastId(null);
          }}
        />
      ) : null}

      <ListPageStatsSection>
        <PricelistProductSummaryStatsCards
          stats={stats}
          isLoading={isStatsLoading}
        />
      </ListPageStatsSection>

      <ListPageSearchToolbar
        search={search}
        searchId="pricelist-products-search"
        placeholder="Search by product name, code, or tariff…"
        searchTestId="pricelist-products-search"
        searchSubmitTestId="pricelist-products-search-submit"
        clearTestId="pricelist-products-search-clear"
        isLoading={isLoading}
        onSearchChange={setSearch}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={handleClearSearch}
        trailing={
          isTenantAdmin ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {totalCount === 0 && !appliedSearch && !activeCopyJobUuid ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-lg px-3 text-[13px] font-medium"
                  onClick={() => setCopyOpen(true)}
                >
                  Copy from pricelist
                </Button>
              ) : null}
              <PageActionButton
                type="button"
                disabled={Boolean(activeCopyJobUuid)}
                onClick={() => setAddOpen(true)}
              >
                Add product
              </PageActionButton>
            </div>
          ) : null
        }
      />

      {totalCount === 0 ? (
        <div className="rounded-xl border border-dashed border-dash-border/80 bg-white px-6 py-14 text-center">
          {appliedSearch ? (
            <>
              <h3 className="text-lg font-semibold text-brand-navy">
                No matching products
              </h3>
              <p className="mt-2 text-sm text-brand-muted">
                Adjust your search and try again.
              </p>
              <SecondaryButton
                type="button"
                className="mt-6"
                onClick={handleClearSearch}
              >
                Clear search
              </SecondaryButton>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-brand-navy">
                No products yet
              </h3>
              <p className="mt-2 text-sm text-brand-muted">
                Add products manually or copy them from another pricelist.
              </p>
              {isTenantAdmin && !activeCopyJobUuid ? (
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-lg px-3 text-[13px] font-medium"
                    onClick={() => setCopyOpen(true)}
                  >
                    Copy from pricelist
                  </Button>
                  <PageActionButton type="button" onClick={() => setAddOpen(true)}>
                    Add product
                  </PageActionButton>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <PricelistProductsTable
            items={items}
            isTenantAdmin={isTenantAdmin}
            onEditPrice={(item) =>
              setPriceEdit({
                item,
                value: item.fixed_price != null ? String(item.fixed_price) : "",
              })
            }
            onEditName={setNameEditItem}
            onEditTariffCode={(item) => {
              void handleEditTariffCode(item);
            }}
            onRemove={setPendingRemove}
          />
          <ListPagePagination
            page={page}
            pageSize={PRODUCTS_PAGE_SIZE}
            totalCount={totalCount}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            isLoading={isLoading}
            onPageChange={(nextPage) => {
              void loadItems({ page: nextPage });
            }}
          />
        </div>
      )}

      <AddPricelistProductDialog
        pricelist={pricelist}
        existingProductUuids={items.map((item) => item.product_uuid)}
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={() => {
          void loadItems({ page: 1 });
          void loadStats();
        }}
      />

      <CopyPricelistProductsDialog
        targetPricelist={pricelist}
        open={copyOpen}
        onOpenChange={setCopyOpen}
        onCopyStarted={(jobUuid, toastId) => {
          setActiveCopyJobUuid(jobUuid);
          setActiveCopyToastId(toastId);
        }}
      />

      <EditPricelistProductNameDialog
        item={nameEditItem}
        open={Boolean(nameEditItem)}
        onOpenChange={(open) => {
          if (!open) {
            setNameEditItem(null);
          }
        }}
        onUpdated={() => {
          void loadItems({ silent: true, page });
          void loadStats();
        }}
      />

      <ProductTariffCodeDialog
        productId={tariffDialog?.productUuid ?? ""}
        open={Boolean(tariffDialog)}
        onOpenChange={(open) => {
          if (!open) {
            setTariffDialog(null);
          }
        }}
        existingCodes={tariffDialog?.existingCodes ?? []}
        editingCode={tariffDialog?.editingCode ?? null}
        preferredSchemeUuid={tariffDialog?.preferredSchemeUuid}
        onSaved={() => {
          void loadItems({ silent: true, page });
          void loadStats();
        }}
      />

      <Dialog
        open={Boolean(priceEdit)}
        onOpenChange={(open) => {
          if (!open && !isSaving) {
            setPriceEdit(null);
          }
        }}
      >
        <DialogContent className={cn("sm:max-w-md", appFont.className)}>
          <DialogHeader>
            <DialogTitle>Update fixed price</DialogTitle>
            <DialogDescription>
              Set the fixed price for {priceEdit?.item.product_name ?? "this product"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="pricelist-edit-fixed-price">Fixed price</Label>
            <Input
              id="pricelist-edit-fixed-price"
              type="number"
              min="0"
              step="any"
              value={priceEdit?.value ?? ""}
              disabled={isSaving}
              onChange={(event) =>
                setPriceEdit((current) =>
                  current ? { ...current, value: event.target.value } : current,
                )
              }
            />
          </div>
          <DialogFooter>
            <SecondaryButton type="button" disabled={isSaving} onClick={() => setPriceEdit(null)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="button" disabled={isSaving} onClick={() => void handleUpdatePrice()}>
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                "Save price"
              )}
            </PrimaryButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(pendingRemove)}
        onOpenChange={(open) => {
          if (!open && !isSaving) {
            setPendingRemove(null);
          }
        }}
      >
        <DialogContent className={cn("sm:max-w-md", appFont.className)}>
          <DialogHeader>
            <DialogTitle>Remove product?</DialogTitle>
            <DialogDescription>
              Remove {pendingRemove?.product_name ?? "this product"} from {pricelist.name}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <SecondaryButton
              type="button"
              disabled={isSaving}
              onClick={() => setPendingRemove(null)}
            >
              Keep product
            </SecondaryButton>
            <DestructiveButton
              type="button"
              disabled={isSaving}
              onClick={() => void handleRemove()}
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Removing...
                </>
              ) : (
                "Remove product"
              )}
            </DestructiveButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
