/**
 * Flat (card-free) layout tokens for the Surveillance and Compliance dashboards.
 * Sections sit on the page background, separated by whitespace and hairlines.
 */

/** Small uppercase section label. */
export const OH_SECTION_LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em] text-dash-muted";

/**
 * Pass to ListPageDataTable: bounds the table's own scroller so the header row can stick,
 * and gives the sticky header an opaque background with a hairline underneath.
 */
export const OH_STICKY_TABLE =
  "[&>div]:max-h-[68vh] [&>div]:overflow-auto [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:bg-white [&_thead_th]:shadow-[inset_0_-1px_0_rgba(15,23,42,0.08)]";
