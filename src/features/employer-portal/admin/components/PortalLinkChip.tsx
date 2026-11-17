"use client";

import { Copy01Icon, LinkSquare02Icon } from "@hugeicons/core-free-icons";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { PortalIcon } from "@/features/employer-portal/components/PortalIcon";
import { portalPath } from "@/features/employer-portal/admin/utils/portal-address";
import { useToast } from "@/providers/toast-provider";
import { useUser } from "@/providers/user-provider";

const subscribeNever = () => () => undefined;
const browserOrigin = () => window.location.origin;
const serverOrigin = () => "";

/** The company portal address for this clinic: opens in a new tab, with a copy button. */
export function PortalLinkChip() {
  const { userData } = useUser();
  const { toast } = useToast();
  const origin = useSyncExternalStore(subscribeNever, browserOrigin, serverOrigin);
  const tenant = userData?.tenant;
  if (!tenant) {
    return null;
  }

  const path = portalPath(tenant.name, tenant.id);
  const url = `${origin}${path}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast({ variant: "success", title: "Portal link copied", description: url });
    } catch (error) {
      console.error("Could not copy the portal link", error);
      toast({ variant: "error", title: "Could not copy", description: "Your browser blocked clipboard access." });
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-1 pr-3 sm:pr-4" data-testid="employers-portal-link">
      <a
        href={path}
        target="_blank"
        rel="noopener noreferrer"
        title="Open the company portal in a new tab"
        className="flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-brand-primary hover:bg-brand-primary/5"
      >
        <span className="hidden max-w-[260px] truncate md:inline">{url || path}</span>
        <span className="md:hidden">Company portal</span>
        <PortalIcon icon={LinkSquare02Icon} size={15} className="shrink-0" />
      </a>
      <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0 text-brand-muted" aria-label="Copy portal link" onClick={() => void copy()}>
        <PortalIcon icon={Copy01Icon} size={15} />
      </Button>
    </div>
  );
}
