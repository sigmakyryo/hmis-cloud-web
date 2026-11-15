import Link from "next/link";
import { LayoutGrid } from "lucide-react";

import { ViewSection } from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import { OH_MODULE_ACCENT, OhPageGlyph } from "@/features/occupational-health/lib/oh-module-visuals";
import { groupOhPages, OH_PAGE_GROUP_LABEL, type OhModule } from "@/features/occupational-health/lib/oh-modules";
import { cn } from "@/lib/utils";

/** The module's pages as the last row, grouped by purpose, each with what it is for. */
export function OhHomePageIndex({ ohModule, exclude = [] }: { ohModule: OhModule; exclude?: string[] }) {
  const pages = ohModule.pages.filter((page) => !exclude.includes(page.href));
  const groups = groupOhPages(pages);

  return (
    <ViewSection title="Pages" icon={LayoutGrid}>
      <nav aria-label={`${ohModule.label} pages`} className="grid gap-x-10 gap-y-6 border-t border-dash-border pt-4 @2xl:grid-cols-2 @4xl:grid-cols-3">
        {groups.map(({ group, pages: inGroup }) => (
          <div key={group} className="min-w-0">
            <h4 className="mb-1.5 text-[12.5px] font-medium text-dash-muted">{OH_PAGE_GROUP_LABEL[group]}</h4>
            <ul>
              {inGroup.map((page) => (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    data-testid="oh-home-page-link"
                    className="group -mx-2 flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-dash-canvas focus-visible:bg-dash-canvas focus-visible:outline-none"
                  >
                    <OhPageGlyph href={page.href} ohModule={ohModule.key} className={cn("mt-0.5 size-4 shrink-0", OH_MODULE_ACCENT[ohModule.key].icon)} />
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-medium text-brand-navy group-hover:text-brand-primary">{page.name}</span>
                      {page.description ? <span className="block text-[12px] leading-snug text-dash-muted">{page.description}</span> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </ViewSection>
  );
}
