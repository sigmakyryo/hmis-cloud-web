import { areaLayout, humanise, tickCounts, type AreaBreakdown, type AreaLayout } from "@/features/occupational-health/components/annual/annual-areas";
import { isSuppressed, toNumber } from "@/features/occupational-health/components/annual/annual-utils";
import { OhAnnualCard } from "@/features/occupational-health/components/annual/OhAnnualCard";
import { ANNUAL_SECTION_LABEL, type AnnualReport } from "@/features/occupational-health/services/oh-annual-report.service";
import { cn } from "@/lib/utils";

/** The figure an area leads with, where it is not simply the first row. */
const LEAD: Record<string, string> = { surveillance: "Completion %" };

/** One line under each card title saying what the area covers. */
const DESCRIPTION: Record<string, string> = {
  workforce: "People covered by this report.",
  medicals: "Examinations by type.",
  fitness: "Outcomes and certificates.",
  surveillance: "Checks that fell due in the period.",
  injuries: "Injury on duty cases and their weight.",
  sick_leave: "Certificates and days covered.",
  health_programmes: "Programme results by outcome.",
  drug_alcohol: "Tests, reasons and results.",
  immunisation: "Vaccine status of workers on file.",
  exposure: "Measurements, events and assessments.",
};

/** Areas that record harm, drawn in warm colours rather than the brand teal. */
const HARM = new Set(["injuries", "exposure"]);

const TEAL = ["bg-brand-primary", "bg-teal-500", "bg-sky-500", "bg-indigo-400", "bg-violet-300", "bg-slate-300"];
const WARM = ["bg-red-600", "bg-orange-500", "bg-amber-400", "bg-yellow-300", "bg-stone-300", "bg-slate-300"];

const quiet = (value: number | string) => isSuppressed(value) || toNumber(value) === 0;

/** A half ring filled to a percentage, with the figure inside it. */
function Gauge({ percent, label }: { percent: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative mx-auto w-44" role="img" aria-label={`${label}: ${percent}%`}>
      <svg viewBox="0 0 140 78" className="block w-full" aria-hidden>
        <path d="M10 70 A60 60 0 0 1 130 70" fill="none" strokeWidth="12" strokeLinecap="round" className="stroke-dash-canvas" pathLength={100} />
        {clamped > 0 ? <path d="M10 70 A60 60 0 0 1 130 70" fill="none" strokeWidth="12" strokeLinecap="round" className="stroke-brand-primary" pathLength={100} strokeDasharray={`${clamped} 100`} /> : null}
      </svg>
      <p className="absolute inset-x-0 bottom-0 text-center">
        <span className="block text-[26px] leading-none font-semibold tracking-tight text-brand-navy tabular-nums">{percent}%</span>
        <span className="mt-1 block text-[11.5px] text-dash-muted">{label}</span>
      </p>
    </div>
  );
}

/**
 * One breakdown as a bar of thin ticks shared out in proportion to its parts, with the parts listed under
 * it. While a part is hidden as "<5" the true total is unknown, so there is no bar and no share.
 */
function Breakdown({ breakdown, shades }: { breakdown: AreaBreakdown; shades: string[] }) {
  const numeric = breakdown.parts.map((part) => toNumber(part.value) ?? 0);
  const drawBar = !breakdown.hasHidden && breakdown.parts.length >= 2 && numeric.some((value) => value > 0);
  const counts = drawBar ? tickCounts(numeric) : [];
  const ticks = counts.flatMap((count, part) => Array.from({ length: count }, (_, i) => ({ part, key: `${part}-${i}` })));
  const showShares = breakdown.parts.some((part) => part.share !== null);

  return (
    <div data-testid={`annual-breakdown-${breakdown.key}`}>
      <p className="text-[12.5px] font-medium text-brand-slate">{breakdown.title}</p>
      {drawBar ? (
        <div role="img" aria-label={`${breakdown.title}: ${breakdown.parts.map((part) => `${part.label} ${part.value}`).join(", ")}`} className="mt-2.5 flex h-7 gap-[2px]">
          {ticks.map((tick) => (
            <span key={tick.key} className={cn("min-w-0 flex-1 rounded-full", shades[tick.part % shades.length])} />
          ))}
        </div>
      ) : null}
      <dl className="mt-3 space-y-2">
        {breakdown.parts.map((part, index) => (
          <div key={part.key} className="flex items-baseline gap-2.5 text-[13.5px]">
            <span aria-hidden className={cn("h-3 w-1 shrink-0 translate-y-0.5 rounded-full", drawBar ? shades[index % shades.length] : "bg-brand-navy/10")} />
            <dt className="min-w-0 flex-1 truncate text-brand-navy">{part.label}</dt>
            <dd className={cn("tabular-nums", quiet(part.value) ? "text-dash-muted" : "font-semibold text-brand-navy")}>{part.value}</dd>
            {showShares ? (
              <dd className="w-10 text-right text-[12.5px] text-dash-muted tabular-nums" aria-label={part.share !== null ? `${part.share} percent` : undefined}>
                {part.share !== null ? `${part.share}%` : ""}
              </dd>
            ) : null}
          </div>
        ))}
      </dl>
      {breakdown.hasHidden && breakdown.parts.length >= 2 ? <p className="mt-2 text-[12px] text-dash-muted">Shares are left out while a count is hidden.</p> : null}
    </div>
  );
}

function leadOf(key: string, layout: AreaLayout) {
  const index = Math.max(
    0,
    layout.stats.findIndex((stat) => stat.key === LEAD[key]),
  );
  return { lead: layout.stats[index], rest: layout.stats.filter((_, i) => i !== index) };
}

/**
 * One card per area: its main figure large (or a gauge for surveillance), its other counts beneath, then
 * each breakdown as a bar of ticks. Hidden counts ("<5") never get a bar or a share.
 */
export function OhAnnualAreas({ report }: { report: AnnualReport }) {
  const areas = Object.entries(report.sections).map(([key, rows]) => ({ key, title: ANNUAL_SECTION_LABEL[key] ?? humanise(key), layout: areaLayout(rows) }));

  return (
    <div data-testid="annual-report-sections" className="grid gap-4 @3xl:grid-cols-2 @6xl:grid-cols-3">
      {areas.map(({ key, title, layout }) => {
        const empty = layout.stats.length === 0 && layout.breakdowns.length === 0;
        const { lead, rest } = leadOf(key, layout);
        const shades = HARM.has(key) ? WARM : TEAL;
        const percent = key === "surveillance" && lead ? toNumber(lead.value) : null;
        return (
          <div key={key} data-testid={`annual-section-${key}`} className="contents">
            <OhAnnualCard id={`annual-section-${key}`} title={title} description={DESCRIPTION[key]}>
              {empty ? (
                <p className="text-[13.5px] text-dash-muted">Nothing recorded.</p>
              ) : (
                <div className="space-y-6">
                  {percent !== null && lead ? (
                    <Gauge percent={percent} label={lead.label} />
                  ) : lead ? (
                    <p className="flex items-baseline gap-2.5">
                      <span className={cn("text-[34px] leading-none font-semibold tracking-tight tabular-nums", quiet(lead.value) ? "text-brand-navy/35" : "text-brand-navy")}>{lead.value}</span>
                      <span className="text-[13px] text-dash-muted">{lead.label}</span>
                    </p>
                  ) : null}
                  {rest.length > 0 ? (
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 @sm:grid-cols-3">
                      {rest.map((stat) => (
                        <div key={stat.key} className="flex flex-col-reverse">
                          <dt className="text-[12px] leading-snug text-dash-muted">{stat.label}</dt>
                          <dd className={cn("text-[18px] leading-tight font-semibold tabular-nums", quiet(stat.value) ? "font-normal text-brand-navy/35" : "text-brand-navy")}>{stat.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {layout.breakdowns.map((breakdown) => (
                    <Breakdown key={breakdown.key} breakdown={breakdown} shades={shades} />
                  ))}
                </div>
              )}
            </OhAnnualCard>
          </div>
        );
      })}
    </div>
  );
}
