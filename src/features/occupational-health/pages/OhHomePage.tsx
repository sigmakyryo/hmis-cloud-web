"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { OhAccessDenied } from "@/features/occupational-health/components/OhAccessDenied";
import { OhHomeModuleNav } from "@/features/occupational-health/components/oh-home/OhHomeModuleNav";
import { OhModuleView } from "@/features/occupational-health/components/oh-home/OhModuleView";
import { useOhModules } from "@/features/occupational-health/hooks/use-oh-modules";
import { findOhModuleBySlug, type OhModule } from "@/features/occupational-health/lib/oh-modules";

const MODULE_PARAM = "module";

function OhHomeSkeleton() {
  return (
    <div className="space-y-4 bg-white px-5 py-7 md:px-8" aria-busy="true">
      <Skeleton className="h-9 w-56" />
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-9 w-full" />
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

  if (isLoading) {
    return <OhHomeSkeleton />;
  }

  if (modules.length === 0) {
    return <OhAccessDenied />;
  }

  const selected = findOhModuleBySlug(modules, searchParams.get(MODULE_PARAM)) ?? modules[0];

  function selectModule(ohModule: OhModule) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(MODULE_PARAM, ohModule.slug);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div data-testid="oh-home" className="flex min-h-full flex-col bg-white">
      <h1 className="sr-only">Occupational Health</h1>
      <OhHomeModuleNav modules={modules} selected={selected} onSelect={selectModule} />
      <div className="@container flex-1 px-5 py-7 md:px-8">
        <OhModuleView ohModule={selected} />
      </div>
    </div>
  );
}
