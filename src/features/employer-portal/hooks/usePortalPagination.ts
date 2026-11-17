"use client";

import { useState } from "react";

import { clampPage } from "@/features/employer-portal/utils/pagination";

/** Client-side paging for a list. `resetKey` sends the list back to page 1 when a search or filter changes. */
export function usePortalPagination<T>(rows: T[], resetKey = "", initialSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);
  const [seenKey, setSeenKey] = useState(resetKey);

  if (seenKey !== resetKey) {
    setSeenKey(resetKey);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = clampPage(page, totalPages);
  const pageRows = rows.slice((current - 1) * pageSize, current * pageSize);

  return {
    pageRows,
    pagination: {
      page: current,
      pageSize,
      total: rows.length,
      totalPages,
      onPage: setPage,
      onPageSize: (size: number) => {
        setPageSize(size);
        setPage(1);
      },
    },
  };
}
