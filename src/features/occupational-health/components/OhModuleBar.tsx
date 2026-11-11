"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { AppIcon } from "@/components/icons/app-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/constants/routes";
import { DetailPageTabNavItem } from "@/features/app-shell/components/page-layout";
import { useOhModules } from "@/features/occupational-health/hooks/use-oh-modules";
import { resolveOhLocation, type OhModule } from "@/features/occupational-health/lib/oh-modules";
import { recordOhRecentPage } from "@/features/occupational-health/lib/oh-recent-pages";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

function ModuleSwitcher({ modules, current }: { modules: OhModule[]; current: OhModule }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-8 shrink-0 items-center gap-2 rounded-md px-1.5 text-[13px] font-semibold text-brand-navy transition-colors hover:bg-brand-tint/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
        aria-label={`Switch module, current ${current.label}`}
        data-testid="oh-module-switcher"
      >
        <span className="flex size-6 items-center justify-center rounded-md bg-brand-primary text-white">
          <AppIcon name={current.icon} className="size-3.5" />
        </span>
        <span className="hidden sm:inline">{current.label}</span>
        <AppIcon name="chevronUpDown" className="size-3.5 text-dash-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={cn(appFont.className, "w-72 p-1")}>
        {modules.map((module) => {
          const isCurrent = module.key === current.key;
          return (
            <DropdownMenuItem key={module.key} asChild className="items-start gap-3 py-2">
              <Link href={module.pages[0].href} aria-current={isCurrent ? "true" : undefined}>
                <span
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
                    isCurrent ? "bg-brand-primary text-white" : "bg-brand-tint text-brand-primary",
                  )}
                >
                  <AppIcon name={module.icon} className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-brand-navy">{module.label}</span>
                  <span className="block text-[12px] leading-snug text-dash-muted">{module.summary}</span>
                </span>
              </Link>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="gap-2 text-[13px] font-medium text-brand-primary">
          <Link href={ROUTES.occupationalHealthHome}>
            <AppIcon name="grid" className="size-4" />
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

  return (
    <div
      data-testid="oh-module-bar"
      className="flex h-11 shrink-0 items-center gap-1 border-b border-dash-border bg-white pl-2 pr-3 sm:pl-3"
    >
      <Link
        href={ROUTES.occupationalHealthHome}
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-md px-1.5 text-[13px] font-medium text-dash-muted transition-colors hover:bg-brand-tint/40 hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
        aria-label="All Occupational Health modules"
      >
        <AppIcon name="grid" className="size-4" />
        <span className="hidden lg:inline">Occupational Health</span>
      </Link>
      <span className="text-dash-border" aria-hidden>
        /
      </span>
      <ModuleSwitcher modules={modules} current={module} />
      <span className="mx-1.5 h-5 w-px shrink-0 bg-dash-border" aria-hidden />
      <nav
        aria-label={`${module.label} pages`}
        className="scrollbar-hide -mb-px flex h-full min-w-0 flex-1 items-stretch overflow-x-auto"
      >
        {module.pages.map((item) => (
          <DetailPageTabNavItem
            key={item.href}
            href={item.href}
            isActive={item.href === page?.href}
            className="flex items-center"
          >
            {item.name}
          </DetailPageTabNavItem>
        ))}
      </nav>
    </div>
  );
}
