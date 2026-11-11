"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import { Input } from "@/components/ui/input";
import { findOhPage, type OhModule } from "@/features/occupational-health/lib/oh-modules";
import {
  getOhRecentPagesServerSnapshot,
  getOhRecentPagesSnapshot,
  parseOhRecentPages,
  subscribeOhRecentPages,
} from "@/features/occupational-health/lib/oh-recent-pages";

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/** Find a page, and jump back to the last few you opened. */
export function OhHomeRail({
  modules,
  search,
  onSearchChange,
  summary,
}: {
  modules: OhModule[];
  search: string;
  onSearchChange: (value: string) => void;
  summary: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const raw = useSyncExternalStore(
    subscribeOhRecentPages,
    getOhRecentPagesSnapshot,
    getOhRecentPagesServerSnapshot,
  );
  const recent = useMemo(
    () => parseOhRecentPages(raw).flatMap((href) => findOhPage(modules, href) ?? []),
    [modules, raw],
  );

  useEffect(() => {
    function focusOnSlash(event: KeyboardEvent) {
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !isTypingTarget(event.target)) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", focusOnSlash);
    return () => window.removeEventListener("keydown", focusOnSlash);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      {summary ? <p className="max-w-xl text-[13.5px] text-dash-muted">{summary}</p> : null}
      <label className="relative w-full sm:w-72">
        <span className="sr-only">Find an OH page</span>
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-dash-muted" aria-hidden />
        <Input
          ref={inputRef}
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Find a page"
          className="h-9 pl-8"
          data-testid="oh-home-search"
        />
      </label>
      </div>
      {recent.length > 0 ? (
        <p data-testid="oh-home-recent" className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px]">
          <span className="text-dash-muted">Recent</span>
          {recent.map(({ page }) => (
            <Link key={page.href} href={page.href} className="font-medium text-brand-navy hover:text-brand-primary">
              {page.name}
            </Link>
          ))}
        </p>
      ) : null}
    </div>
  );
}
