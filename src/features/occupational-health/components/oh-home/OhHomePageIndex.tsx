import Link from "next/link";

import { OH_MODULE_ACCENT, OhPageGlyph } from "@/features/occupational-health/lib/oh-module-visuals";
import { groupOhPages, OH_PAGE_GROUP_LABEL, type OhModule } from "@/features/occupational-health/lib/oh-modules";
import { cn } from "@/lib/utils";

/** The module's pages as a short list down the side: icon and name, grouped by purpose. */
export function OhHomePageIndex({ ohModule, exclude = [] }: { ohModule: OhModule; exclude?: string[] }) {
  const groups = groupOhPages(ohModule.pages.filter((page) => !exclude.includes(page.href)));

  return (
    <nav aria-label={`${ohModule.label} pages`} className="space-y-5 border-t border-dash-border pt-6 @5xl:sticky @5xl:top-6 @5xl:border-t-0 @5xl:border-l @5xl:pt-0 @5xl:pl-6">
      {groups.map(({ group, pages }) => (
        <div key={group}>
          <h3 className="px-1 text-[12px] font-medium text-dash-muted">{OH_PAGE_GROUP_LABEL[group]}</h3>
          <ul className="mt-1.5 grid gap-x-6 @xl:grid-cols-2 @5xl:grid-cols-1">
            {pages.map((page) => (
              <li key={page.href}>
                <Link
                  href={page.href}
                  title={page.description}
                  data-testid="oh-home-page-link"
                  className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13.5px] font-medium text-brand-navy transition-colors hover:bg-dash-canvas focus-visible:bg-dash-canvas focus-visible:outline-none"
                >
                  <OhPageGlyph href={page.href} ohModule={ohModule.key} className={cn("size-4 shrink-0", OH_MODULE_ACCENT[ohModule.key].icon)} />
                  {page.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
