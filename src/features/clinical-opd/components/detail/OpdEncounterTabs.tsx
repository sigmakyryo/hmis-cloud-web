"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

import { appFont } from "@/lib/fonts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DetailPageTabNavItem,
  DetailPageTabsNavSection,
} from "@/features/app-shell/components/page-layout";
import { useOpdEncounterWorkspace } from "@/features/clinical-opd/components/detail/opd-encounter-workspace-context";
import { useOpdEncounterTabCounts } from "@/features/clinical-opd/hooks/use-clinical-opd";
import { useWorkspaceRouting } from "@/features/clinical-opd/hooks/use-workspace-routing";
import {
  getVisibleWorkspaceMenuSections,
  getVisibleWorkspaceTabs,
  workspaceTabFromPathname,
  workspaceTabHref,
} from "@/features/clinical-workspace/utils/workspace-tabs";
import { cn } from "@/lib/utils";

const TAB_ITEM_CLASS =
  "inline-flex items-center justify-start gap-1.5 px-2 py-1.5 text-left text-[13px]";

type OpdEncounterTabsProps = {
  className?: string;
};

export function OpdEncounterTabs({ className }: OpdEncounterTabsProps) {
  const pathname = usePathname();
  const routing = useWorkspaceRouting();
  const { visitUuid, encounterUuid, capabilities } = useOpdEncounterWorkspace();
  const activeTab = workspaceTabFromPathname(
    routing,
    pathname,
    visitUuid,
    encounterUuid,
  );
  const counts: Partial<Record<string, number>> = useOpdEncounterTabCounts(
    visitUuid,
    encounterUuid,
  );
  const tabs = getVisibleWorkspaceTabs(routing, capabilities);
  const menuSections = getVisibleWorkspaceMenuSections(routing, capabilities);
  const isMenuActive = menuSections.some((section) => section.id === activeTab);

  if (tabs.length === 0 && menuSections.length === 0) {
    return null;
  }

  return (
    <DetailPageTabsNavSection
      aria-label={`${routing.encounterNoun} sections`}
      className={className}
      navClassName="min-w-0 overflow-x-hidden"
    >
      <div className="flex w-full min-w-0 items-end justify-start gap-0">
        <div className="scrollbar-hide flex min-w-0 flex-1 justify-start gap-0 overflow-x-auto">
          {tabs.map((tab) => {
            const count = counts[tab.id] ?? 0;

            return (
              <DetailPageTabNavItem
                key={tab.id}
                href={workspaceTabHref(routing, visitUuid, encounterUuid, tab.id)}
                isActive={activeTab === tab.id}
                className={TAB_ITEM_CLASS}
              >
                {tab.label}
                {count > 0 ? (
                  <span
                    className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium leading-none tabular-nums text-brand-muted"
                    data-testid={`opd-encounter-tab-count-${tab.id}`}
                  >
                    {count}
                  </span>
                ) : null}
              </DetailPageTabNavItem>
            );
          })}
        </div>

        {menuSections.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "mb-px shrink-0 whitespace-nowrap text-sm font-medium transition-colors",
              TAB_ITEM_CLASS,
              isMenuActive
                ? "text-brand-navy"
                : "text-brand-muted hover:text-brand-navy",
            )}
            aria-label="More encounter sections"
            data-testid="opd-encounter-more-sections"
          >
            <MoreHorizontal className="size-3.5" aria-hidden="true" />
            More
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className={cn("min-w-44", appFont.className)}
          >
            {menuSections.map((section) => (
              <DropdownMenuItem key={section.id} asChild>
                <Link
                  href={workspaceTabHref(
                    routing,
                    visitUuid,
                    encounterUuid,
                    section.id,
                  )}
                >
                  {section.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        ) : null}
      </div>
    </DetailPageTabsNavSection>
  );
}
