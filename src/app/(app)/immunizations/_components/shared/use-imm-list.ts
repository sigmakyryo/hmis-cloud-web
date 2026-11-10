"use client";

import { useMemo, useState } from "react";

export type ImmSortDirection = "asc" | "desc";
export type ImmSort = { key: string; direction: ImmSortDirection } | null;
export type ImmSortValue = string | number | boolean | null | undefined;

export const IMM_PAGE_SIZE = 25;

/** State a table needs to render sortable headers and the pagination footer. */
export type ImmListControls = {
  sort: ImmSort;
  toggleSort: (key: string) => void;
  page: number;
  setPage: (page: number) => void;
  matched: number;
  pageSize: number;
};

function compare(a: ImmSortValue, b: ImmSortValue): number {
  const aEmpty = a == null || a === "";
  const bEmpty = b == null || b === "";
  if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Client-side search, sort, and pagination for immunization record lists.
 * Empty values always sort last, whichever direction is active.
 */
export function useImmList<Row>({
  rows,
  searchText,
  sortValue,
  defaultSort = null,
  pageSize = IMM_PAGE_SIZE,
}: {
  rows: Row[];
  searchText?: (row: Row) => string;
  sortValue?: (row: Row, key: string) => ImmSortValue;
  defaultSort?: ImmSort;
  pageSize?: number;
}) {
  const [query, setQueryState] = useState("");
  const [sort, setSort] = useState<ImmSort>(defaultSort);
  const [page, setPage] = useState(1);

  const needle = query.trim().toLowerCase();
  const matchedRows = useMemo(() => {
    const filtered = needle && searchText ? rows.filter((row) => searchText(row).toLowerCase().includes(needle)) : rows;
    if (!sort || !sortValue) return filtered;
    const factor = sort.direction === "asc" ? 1 : -1;
    return filtered.toSorted((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      const emptyA = av == null || av === "";
      const emptyB = bv == null || bv === "";
      if (emptyA || emptyB) return compare(av, bv);
      return compare(av, bv) * factor;
    });
  }, [rows, needle, searchText, sort, sortValue]);

  const pageCount = Math.max(1, Math.ceil(matchedRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = matchedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const controls: ImmListControls = {
    sort,
    toggleSort: (key) => {
      setSort((prev) =>
        prev?.key === key ? { key, direction: prev.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" },
      );
      setPage(1);
    },
    page: currentPage,
    setPage,
    matched: matchedRows.length,
    pageSize,
  };

  return {
    query,
    setQuery: (value: string) => {
      setQueryState(value);
      setPage(1);
    },
    pageRows,
    matchedRows,
    total: rows.length,
    controls,
  };
}
