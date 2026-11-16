"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { AppIcon } from "@/components/icons/app-icon";
import { useWorkspaceStore } from "@/state/workspace.store";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { SidebarNavItem } from "@/features/app-shell/utils/build-sidebar-nav";
import { cn } from "@/lib/utils";

function NavMenuItems({ items }: { items: SidebarNavItem[] }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const openNavSections = useWorkspaceStore((state) => state.openNavSections);
  const setNavSectionOpen = useWorkspaceStore((state) => state.setNavSectionOpen);

  return (
    <SidebarMenu>
      {items.map((item) =>
        item.items?.length && !item.flat ? (
          <Collapsible
            key={item.title}
            asChild
            open={openNavSections[item.title] ?? Boolean(item.isActive)}
            onOpenChange={(open) => setNavSectionOpen(item.title, open)}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={collapsed && Boolean(item.isActive)}
                  className={cn(
                    item.isActive && !collapsed && "font-medium text-brand-navy",
                  )}
                >
                  {item.icon ? <AppIcon name={item.icon} /> : null}
                  <span className="truncate">{item.title}</span>
                  <ChevronRight
                    aria-hidden
                    strokeWidth={2}
                    className="ml-auto !size-3.5 shrink-0 text-dash-muted transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                  />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton asChild isActive={subItem.isActive}>
                        <Link href={subItem.url}>
                          <span>{subItem.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ) : (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild isActive={item.isActive} tooltip={item.title}>
              <Link href={item.url}>
                {item.icon ? <AppIcon name={item.icon} /> : null}
                <span>{item.title}</span>
                {item.showUnreadDot ? (
                  <span
                    className="ml-auto size-1.5 rounded-full bg-brand-primary"
                    data-testid="nav-unread-dot"
                    aria-label="Unread notifications"
                  />
                ) : null}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ),
      )}
    </SidebarMenu>
  );
}

export function NavMain({ items }: { items: SidebarNavItem[] }) {
  const workspaceItems = items.filter(
    (item) => item.section !== "admin" && item.section !== "account",
  );
  const adminItems = items.filter((item) => item.section === "admin");

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      {workspaceItems.length > 0 ? (
        <SidebarGroup className="px-2 py-1">
          <NavMenuItems items={workspaceItems} />
        </SidebarGroup>
      ) : null}
      {adminItems.length > 0 ? (
        <SidebarGroup>
          <SidebarGroupLabel
            className={cn(
              "h-7 px-3 text-[12px] font-medium text-dash-muted",
            )}
          >
            Admin
          </SidebarGroupLabel>
          <NavMenuItems items={adminItems} />
        </SidebarGroup>
      ) : null}
    </>
  );
}
