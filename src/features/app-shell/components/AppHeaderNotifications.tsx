"use client";

import { useState } from "react";

import { AppIcon } from "@/components/icons/app-icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NotificationsPanel } from "@/features/notifications/components/NotificationsPanel";
import { useInboxUnreadCount } from "@/features/notifications/hooks/use-inbox-unread-count";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

function unreadLabel(count: number) {
  if (count <= 0) {
    return "Notifications";
  }
  if (count > 99) {
    return "Notifications, 99+ unread";
  }
  return `Notifications, ${count} unread`;
}

export function AppHeaderNotifications() {
  const [open, setOpen] = useState(false);
  const unreadCount = useInboxUnreadCount(true, { notifyOnNew: true });
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <SidebarMenuItem>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <SidebarMenuButton
            tooltip={unreadLabel(unreadCount)}
            data-testid="app-header-notifications-trigger"
            aria-label={unreadLabel(unreadCount)}
          >
            <AppIcon name="notification" size={18} />
            <span>Notifications</span>
          </SidebarMenuButton>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="end"
          sideOffset={8}
          className={cn(appFont.className, "w-80 overflow-hidden p-0")}
          data-testid="app-header-notifications-popover"
        >
        <NotificationsPanel
          enabled={open}
          maxItems={6}
          pageSize={12}
          compact
          className="rounded-none border-0"
          emptyTitle="You're all caught up"
          emptyDescription="New notifications will show up here."
          data-testid="app-header-notifications-panel"
        />
        </PopoverContent>
      </Popover>
      {unreadCount > 0 ? (
        <>
          <SidebarMenuBadge
            data-testid="app-header-notifications-badge"
            className="bg-brand-primary text-[10px] font-semibold text-white"
          >
            {badgeLabel}
          </SidebarMenuBadge>
          <span
            aria-hidden
            className="pointer-events-none absolute right-1.5 top-1.5 hidden size-2 rounded-full bg-brand-primary group-data-[collapsible=icon]:block"
          />
        </>
      ) : null}
    </SidebarMenuItem>
  );
}
