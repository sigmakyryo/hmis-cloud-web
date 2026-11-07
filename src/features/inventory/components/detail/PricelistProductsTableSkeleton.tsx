import { Skeleton } from "@/components/ui/skeleton";
import {
  ListPageDataTable,
  ListPageDataTableBody,
  ListPageDataTableCell,
  ListPageDataTableHeader,
  ListPageDataTableHeaderCell,
  ListPageDataTableHeaderRow,
  ListPageDataTableRow,
} from "@/features/app-shell/components/page-layout";

type PricelistProductsTableSkeletonProps = {
  rows?: number;
  showActions?: boolean;
  className?: string;
};

export function PricelistProductsTableSkeleton({
  rows = 8,
  showActions = true,
  className,
}: PricelistProductsTableSkeletonProps) {
  return (
    <ListPageDataTable className={className}>
      <ListPageDataTableHeader>
        <ListPageDataTableHeaderRow>
          <ListPageDataTableHeaderCell>Product</ListPageDataTableHeaderCell>
          <ListPageDataTableHeaderCell>Tariff code</ListPageDataTableHeaderCell>
          <ListPageDataTableHeaderCell>Type</ListPageDataTableHeaderCell>
          <ListPageDataTableHeaderCell className="text-right">
            Min qty
          </ListPageDataTableHeaderCell>
          <ListPageDataTableHeaderCell className="text-right">
            Fixed price
          </ListPageDataTableHeaderCell>
          <ListPageDataTableHeaderCell>Valid</ListPageDataTableHeaderCell>
          <ListPageDataTableHeaderCell>Added by</ListPageDataTableHeaderCell>
          {showActions ? (
            <ListPageDataTableHeaderCell className="text-right pr-4">
              Actions
            </ListPageDataTableHeaderCell>
          ) : null}
        </ListPageDataTableHeaderRow>
      </ListPageDataTableHeader>
      <ListPageDataTableBody>
        {Array.from({ length: rows }).map((_, index) => (
          <ListPageDataTableRow key={index} className="hover:bg-transparent">
            <ListPageDataTableCell className="py-2">
              <Skeleton className="h-3.5 w-40" />
            </ListPageDataTableCell>
            <ListPageDataTableCell className="py-2">
              <Skeleton className="h-3.5 w-16" />
            </ListPageDataTableCell>
            <ListPageDataTableCell className="py-2">
              <Skeleton className="h-3.5 w-16" />
            </ListPageDataTableCell>
            <ListPageDataTableCell className="py-2 text-right">
              <div className="flex justify-end">
                <Skeleton className="h-3.5 w-10" />
              </div>
            </ListPageDataTableCell>
            <ListPageDataTableCell className="py-2 text-right">
              <div className="flex justify-end">
                <Skeleton className="h-3.5 w-16" />
              </div>
            </ListPageDataTableCell>
            <ListPageDataTableCell className="py-2">
              <Skeleton className="h-3.5 w-32" />
            </ListPageDataTableCell>
            <ListPageDataTableCell className="py-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-5 rounded-md" />
                <Skeleton className="h-3.5 w-20" />
              </div>
            </ListPageDataTableCell>
            {showActions ? (
              <ListPageDataTableCell className="py-2 pr-4 text-right">
                <div className="flex justify-end gap-1.5">
                  <Skeleton className="h-7 w-16 rounded-md" />
                  <Skeleton className="size-7 rounded-lg" />
                </div>
              </ListPageDataTableCell>
            ) : null}
          </ListPageDataTableRow>
        ))}
      </ListPageDataTableBody>
    </ListPageDataTable>
  );
}
