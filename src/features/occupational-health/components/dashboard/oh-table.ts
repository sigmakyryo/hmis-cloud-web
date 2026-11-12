import { useMemo, useState } from "react";

export type OhSortDir = "asc" | "desc";
export type OhSort<K extends string> = { key: K; dir: OhSortDir };

/** Client-side sort + pagination for already-filtered rows. Page is clamped when rows shrink. */
export function useOhTable<T, K extends string>({
  rows,
  initialSort,
  sortValue,
  pageSize = 20,
}: {
  rows: T[];
  initialSort: OhSort<K>;
  sortValue: (row: T, key: K) => string | number | null | undefined;
  pageSize?: number;
}) {
  const [sort, setSort] = useState<OhSort<K>>(initialSort);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      if (av === bv) return 0;
      if (av === null || av === undefined || av === "") return 1;
      if (bv === null || bv === undefined || bv === "") return -1;
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
    // sortValue is a stable module-level function in callers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pageCount);
  const pageRows = sorted.slice((current - 1) * pageSize, current * pageSize);

  return {
    sort,
    toggleSort: (key: K) => {
      setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
      setPage(1);
    },
    page: current,
    setPage,
    pageSize,
    pageCount,
    total: sorted.length,
    sorted,
    pageRows,
  };
}

/** CSV with a formula-injection guard (cells starting =, +, -, @ get a leading quote). */
export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const cell = (value: string | number | null | undefined) => {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(text)) {
      text = `'${text}`;
    }
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers, ...rows].map((r) => r.map(cell).join(",")).join("\n") + "\n";
}

export function downloadText(filename: string, text: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Opens a same-origin file URL (PDF / CSV through the BFF) in a new tab or as a download. */
export function openFile(url: string, download = false) {
  const anchor = document.createElement("a");
  anchor.href = url;
  if (download) {
    anchor.download = "";
  } else {
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
  }
  anchor.click();
}
