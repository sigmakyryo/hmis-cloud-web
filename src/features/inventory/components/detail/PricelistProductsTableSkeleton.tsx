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
import { cn } from "@/lib/utils";

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
    <ListPageDataTable className={cn("[&_table]:table-fixed", className)}>
      <ListPageDataTableHeader>
        <ListPageDataTableHeaderRow>
          <ListPageDataTableHeaderCell className="w-[15rem]">
            Product
          </ListPageDataTableHeaderCell>
          <ListPageDataTableHeaderCell className="w-[6.5rem]">
            Tariff code
          </ListPageDataTableHeaderCell>
          <ListPageDataTableHeaderCell className="w-[5.5rem]">
            Type
          </ListPageDataTableHeaderCell>
          <ListPageDataTableHeaderCell>Benefit category</ListPageDataTableHeaderCell>
          <ListPageDataTableHeaderCell>Payer rule(s)</ListPageDataTableHeaderCell>
          <ListPageDataTableHeaderCell className="w-[4.5rem] text-right">
            Min qty
          </ListPageDataTableHeaderCell>
          <ListPageDataTableHeaderCell className="w-[6rem] text-right">
            Fixed price
          </ListPageDataTableHeaderCell>
          <ListPageDataTableHeaderCell className="w-[8rem]">
            Added by
          </ListPageDataTableHeaderCell>
          {showActions ? (
            <ListPageDataTableHeaderCell className="w-[7.5rem] text-right pr-4">
              Actions
            </ListPageDataTableHeaderCell>
          ) : null}
        </ListPageDataTableHeaderRow>
      </ListPageDataTableHeader>
      <ListPageDataTableBody>
        {Array.from({ length: rows }).map((_, index) => (
          <ListPageDataTableRow key={index} className="hover:bg-transparent">
            <ListPageDataTableCell className="max-w-0 py-2">
              <Skeleton className="h-3.5 w-28" />
            </ListPageDataTableCell>
            <ListPageDataTableCell className="py-2">
              <Skeleton className="h-3.5 w-14" />
            </ListPageDataTableCell>
            <ListPageDataTableCell className="py-2">
              <Skeleton className="h-3.5 w-14" />
            </ListPageDataTableCell>
            <ListPageDataTableCell className="max-w-0 py-2">
              <Skeleton className="h-3.5 w-24" />
            </ListPageDataTableCell>
            <ListPageDataTableCell className="max-w-0 py-2">
              <Skeleton className="h-3.5 w-28" />
            </ListPageDataTableCell>
            <ListPageDataTableCell className="py-2 text-right">
              <div className="flex justify-end">
                <Skeleton className="h-3.5 w-8" />
              </div>
            </ListPageDataTableCell>
            <ListPageDataTableCell className="py-2 text-right">
              <div className="flex justify-end">
                <Skeleton className="h-3.5 w-14" />
              </div>
            </ListPageDataTableCell>
            <ListPageDataTableCell className="py-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-5 rounded-md" />
                <Skeleton className="h-3.5 w-16" />
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
