"use client";

import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowLeftDoubleIcon,
  ArrowRight01Icon,
  ArrowRightDoubleIcon,
} from "@hugeicons/core-free-icons";

import { PortalIcon, type PortalIconSvg } from "@/features/employer-portal/components/PortalIcon";
import { PAGE_SIZES, pageItems } from "@/features/employer-portal/utils/pagination";
import { cn } from "@/lib/utils";

export type PortalPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
};

const buttonClass =
  "flex size-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-[14px] text-neutral-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white";

function NavButton({ label, icon, disabled, onClick }: { label: string; icon: PortalIconSvg; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className={buttonClass}>
      <PortalIcon icon={icon} size={16} />
    </button>
  );
}

/** "Page 2 of 16", numbered buttons in the middle and a page size picker on the right. */
export function PortalPagination({ page, pageSize, total, totalPages, onPage, onPageSize }: PortalPaginationProps) {
  if (total === 0) {
    return null;
  }

  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-neutral-300/80 pt-4" data-testid="portal-pagination">
      <p className="min-w-[110px] text-[14px] text-neutral-500">
        Page {page} of {totalPages}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <NavButton label="First page" icon={ArrowLeftDoubleIcon} disabled={page === 1} onClick={() => onPage(1)} />
        <NavButton label="Previous page" icon={ArrowLeft01Icon} disabled={page === 1} onClick={() => onPage(page - 1)} />
        {pageItems(page, totalPages).map((item, index) =>
          item === "gap" ? (
            <span key={`gap-${index}`} className={cn(buttonClass, "pointer-events-none")} aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-label={`Page ${item}`}
              aria-current={item === page ? "page" : undefined}
              onClick={() => onPage(item)}
              className={cn(buttonClass, item === page && "border-neutral-300 font-medium text-neutral-900")}
            >
              {item}
            </button>
          ),
        )}
        <NavButton label="Next page" icon={ArrowRight01Icon} disabled={page === totalPages} onClick={() => onPage(page + 1)} />
        <NavButton label="Last page" icon={ArrowRightDoubleIcon} disabled={page === totalPages} onClick={() => onPage(totalPages)} />
      </div>
      <label className="relative flex min-w-[110px] justify-end">
        <span className="sr-only">Rows per page</span>
        <select
          value={pageSize}
          onChange={(event) => onPageSize(Number(event.target.value))}
          className="h-10 appearance-none rounded-lg border border-neutral-200 bg-white pr-9 pl-3 text-[14px] text-neutral-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-neutral-500">
          <PortalIcon icon={ArrowDown01Icon} size={15} />
        </span>
      </label>
    </nav>
  );
}
