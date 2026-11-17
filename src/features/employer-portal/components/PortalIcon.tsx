"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";

export type PortalIconSvg = IconSvgElement;

/** Hugeicons wrapper for the company portal. Colour follows the surrounding text. */
export function PortalIcon({ icon, size = 18, className }: { icon: PortalIconSvg; size?: number; className?: string }) {
  return <HugeiconsIcon icon={icon} size={size} strokeWidth={1.5} color="currentColor" className={className} />;
}
