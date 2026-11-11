import Link from "next/link";

import { OhPageGlyph } from "@/features/occupational-health/lib/oh-module-visuals";
import type { OhModule, OhModulePage } from "@/features/occupational-health/lib/oh-modules";

/** One page in the index: a small icon, the name, and what the page is for. */
export function OhHomePageRow({
  page,
  ohModule,
  showModule = false,
  detail,
  hideDescription = false,
}: {
  page: OhModulePage;
  ohModule: OhModule;
  showModule?: boolean;
  /** Replaces the static description, for a figure that comes from live data. */
  detail?: string;
  hideDescription?: boolean;
}) {
  return (
    <li className="border-b border-dash-border/70">
      <Link
        href={page.href}
        data-testid="oh-home-page-link"
        className="group flex items-baseline gap-x-3 py-2.5 focus-visible:outline-none"
      >
        <OhPageGlyph
          href={page.href}
          ohModule={ohModule.key}
          className="size-3.5 shrink-0 translate-y-0.5 text-dash-muted group-hover:text-brand-primary"
        />
        <span className="shrink-0 text-[14px] font-medium text-brand-navy group-hover:text-brand-primary">
          {page.name}
        </span>
        {showModule ? <span className="shrink-0 text-[12.5px] text-brand-primary">{ohModule.label}</span> : null}
        {detail || (!hideDescription && page.description) ? (
          <span className="min-w-0 truncate text-[13px] text-dash-muted">
            {detail || page.description}
          </span>
        ) : null}
      </Link>
    </li>
  );
}
