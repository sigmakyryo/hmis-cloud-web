"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, LayoutGrid } from "lucide-react";
import { createElement, useEffect } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/constants/routes";
import { OH_MODULE_ACCENT, OH_MODULE_ICON } from "@/features/occupational-health/lib/oh-module-visuals";
import { useOhModules } from "@/features/occupational-health/hooks/use-oh-modules";
import { resolveOhLocation, type OhModule } from "@/features/occupational-health/lib/oh-modules";
import { recordOhRecentPage } from "@/features/occupational-health/lib/oh-recent-pages";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

function ModuleGlyph({ ohModule, className }: { ohModule: OhModule; className?: string }) {
  return createElement(OH_MODULE_ICON[ohModule.key], {
    className: cn("shrink-0", OH_MODULE_ACCENT[ohModule.key].icon, className),
    "aria-hidden": true,
  });
}

function ModuleSwitcher({ modules, current }: { modules: OhModule[]; current: OhModule }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="group flex h-9 shrink-0 items-center gap-2 rounded-lg pr-1.5 pl-1 text-[14.5px] font-semibold tracking-tight text-brand-navy transition-colors hover:bg-dash-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
        aria-label={`Switch module, current ${current.label}`}
        data-testid="oh-module-switcher"
      >
        <ModuleGlyph ohModule={current} className="size-[18px]" />
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className="size-3.5 text-dash-muted transition-transform group-data-[state=open]:rotate-180" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className={cn(appFont.className, "w-80 p-1.5")}>
        {modules.map((module) => {
          const isCurrent = module.key === current.key;
          return (
            <DropdownMenuItem key={module.key} asChild className="items-start gap-3 rounded-lg px-2.5 py-2.5">
              <Link href={module.pages[0].href} aria-current={isCurrent ? "true" : undefined}>
                <ModuleGlyph ohModule={module} className="mt-0.5 size-4" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-brand-navy">{module.label}</span>
                  <span className="block text-[12px] leading-snug text-dash-muted">{module.summary}</span>
                </span>
                {isCurrent ? <Check className="mt-0.5 size-4 shrink-0 text-brand-primary" aria-hidden /> : null}
              </Link>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="gap-2 rounded-lg px-2.5 text-[13px] font-medium text-brand-primary">
          <Link href={ROUTES.occupationalHealthHome}>
            <LayoutGrid className="size-4" aria-hidden />
            All modules
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Where-am-I bar for OH pages: back to OH home, switch module, move between the module's pages. */
export function OhModuleBar() {
  const pathname = usePathname();
  const { modules } = useOhModules();
  const location = resolveOhLocation(pathname, modules);
  const visitedHref = location?.page?.href;

  useEffect(() => {
    if (visitedHref) {
      recordOhRecentPage(visitedHref);
    }
  }, [visitedHref]);

  if (!location) {
    return null;
  }

  const { module, page } = location;
  const accent = OH_MODULE_ACCENT[module.key];

  return (
    <div
      data-testid="oh-module-bar"
      className="flex h-12 shrink-0 items-stretch gap-3 border-b border-dash-border bg-white px-3 md:px-5"
    >
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={ROUTES.occupationalHealthHome}
          className="flex size-8 items-center justify-center rounded-lg text-dash-muted transition-colors hover:bg-dash-canvas hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
          aria-label="All Occupational Health modules"
          title="All Occupational Health modules"
        >
          <LayoutGrid className="size-4" aria-hidden />
        </Link>
        <ModuleSwitcher modules={modules} current={module} />
      </div>
      <nav
        aria-label={`${module.label} pages`}
        className="scrollbar-hide flex min-w-0 flex-1 items-stretch gap-6 overflow-x-auto pl-3 md:border-l md:border-dash-border md:pl-6"
      >
        {module.pages.map((item) => {
          const isActive = item.href === page?.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "-mb-px flex shrink-0 items-center border-b-2 text-[13.5px] whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:text-brand-primary",
                isActive
                  ? cn(accent.rule, "font-semibold text-brand-navy")
                  : "border-transparent font-medium text-dash-muted hover:text-brand-navy",
              )}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
