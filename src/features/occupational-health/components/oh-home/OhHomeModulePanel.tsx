import { OhHomePageRow } from "@/features/occupational-health/components/oh-home/OhHomePageRow";
import { groupOhPages, OH_PAGE_GROUP_LABEL, type OhModule } from "@/features/occupational-health/lib/oh-modules";

/** The chosen module's pages, grouped by what you come here to do. */
export function OhHomeModulePanel({ ohModule }: { ohModule: OhModule }) {
  const groups = groupOhPages(ohModule.pages);
  return (
    <section aria-label={ohModule.label} data-testid="oh-home-module-detail" className="space-y-7">
      <h2 className="sr-only">{ohModule.label}</h2>
      {groups.map(({ group, pages }) => (
        <div key={group}>
          <h3 className="text-[13px] font-semibold text-brand-navy">{OH_PAGE_GROUP_LABEL[group]}</h3>
          <ul className="mt-1 grid @3xl:grid-cols-2 @3xl:gap-x-12">
            {pages.map((page) => (
              <OhHomePageRow key={page.href} page={page} ohModule={ohModule} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
