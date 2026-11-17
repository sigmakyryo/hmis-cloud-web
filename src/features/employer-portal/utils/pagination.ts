export const PAGE_SIZES = [7, 10, 25, 50] as const;

export type PageItem = number | "gap";

/**
 * Page numbers to show: always the first and last, the pages around the current one, and a gap for the rest.
 * Up to seven pages are listed in full.
 */
export function pageItems(current: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "gap", totalPages];
  }
  if (current >= totalPages - 3) {
    return [1, "gap", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "gap", current - 1, current, current + 1, "gap", totalPages];
}

export function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(page, 1), Math.max(totalPages, 1));
}
