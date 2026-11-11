"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { OhAccessDenied } from "@/features/occupational-health/components/OhAccessDenied";
import { OhClinicHome } from "@/features/occupational-health/components/oh-home/OhClinicHome";
import { OhHomeModulePanel } from "@/features/occupational-health/components/oh-home/OhHomeModulePanel";
import { OhHomeModuleStrip } from "@/features/occupational-health/components/oh-home/OhHomeModuleStrip";
import { OhHomePageRow } from "@/features/occupational-health/components/oh-home/OhHomePageRow";
import { OhHomeRail } from "@/features/occupational-health/components/oh-home/OhHomeRail";
import { useOhModules } from "@/features/occupational-health/hooks/use-oh-modules";
import { findOhModuleBySlug, type OhModule } from "@/features/occupational-health/lib/oh-modules";
import { cn } from "@/lib/utils";

const MODULE_PARAM = "module";

function SearchResults({ modules, query }: { modules: OhModule[]; query: string }) {
  const results = modules.flatMap((ohModule) =>
    ohModule.pages
      .filter((page) => [page.name, page.description, ohModule.label].join(" ").toLowerCase().includes(query))
      .map((page) => ({ ohModule, page })),
  );

  if (results.length === 0) {
    return (
      <p className="py-8 text-[13.5px] text-dash-muted" data-testid="oh-home-no-results">
        No page matches &ldquo;{query}&rdquo;.
      </p>
    );
  }

  return (
    <section aria-label="Search results">
      <h2 className="text-[13px] font-semibold text-brand-navy">
        {results.length} {results.length === 1 ? "page" : "pages"}
      </h2>
      <ul className="mt-1 grid @3xl:grid-cols-2 @3xl:gap-x-12">
        {results.map(({ ohModule, page }) => (
          <OhHomePageRow key={page.href} page={page} ohModule={ohModule} showModule />
        ))}
      </ul>
    </section>
  );
}

function OhHomeSkeleton() {
  return (
    <div className="px-6 py-6" aria-busy="true">
      <Skeleton className="mb-6 h-4 w-80" />
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="mb-3 h-4 w-full" />
      ))}
    </div>
  );
}

/** Occupational Health home: choose a module, then the page inside it. */
export function OhHomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { modules, isLoading } = useOhModules();
  const [search, setSearch] = useState("");
  const query = useDeferredValue(search.trim().toLowerCase());

  if (isLoading) {
    return <OhHomeSkeleton />;
  }

  if (modules.length === 0) {
    return <OhAccessDenied />;
  }

  const selected = findOhModuleBySlug(modules, searchParams.get(MODULE_PARAM)) ?? modules[0];
  const isClinic = selected.key === "OccupationalHealth";

  function selectModule(ohModule: OhModule) {
    setSearch("");
    const params = new URLSearchParams(searchParams.toString());
    params.set(MODULE_PARAM, ohModule.slug);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div data-testid="oh-home" className="flex min-h-full flex-col bg-white">
      <h1 className="sr-only">Occupational Health</h1>
      <OhHomeModuleStrip modules={modules} selected={selected} onSelect={selectModule} />
      <div className={cn("@container w-full space-y-6 px-5 py-5 md:px-6", !isClinic && "max-w-5xl")}>
        <OhHomeRail
          modules={modules}
          search={search}
          onSearchChange={setSearch}
          summary={isClinic && !query ? "" : selected.summary}
        />
        {query ? (
          <SearchResults modules={modules} query={query} />
        ) : isClinic ? (
          <OhClinicHome ohModule={selected} />
        ) : (
          <OhHomeModulePanel ohModule={selected} />
        )}
      </div>
    </div>
  );
}
