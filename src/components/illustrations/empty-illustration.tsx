import { cn } from "@/lib/utils";

export type EmptyIllustrationVariant = "chart" | "donut" | "documents" | "search";

/**
 * Small line-and-tint pictures for empty states, drawn in the brand teal so they sit quietly on white.
 * They are decorative: the words next to them carry the meaning.
 */
export function EmptyIllustration({ variant, className }: { variant: EmptyIllustrationVariant; className?: string }) {
  return (
    <svg viewBox="0 0 160 120" fill="none" aria-hidden className={cn("h-28 w-auto shrink-0", className)}>
      <ellipse cx="80" cy="108" rx="52" ry="5" className="fill-brand-primary/8" />
      {variant === "chart" ? (
        <>
          <rect x="22" y="14" width="116" height="84" rx="12" className="fill-brand-tint" />
          <path d="M38 80h84" strokeWidth="1.5" strokeLinecap="round" className="stroke-brand-primary/25" />
          <rect x="44" y="58" width="12" height="22" rx="3" strokeWidth="1.5" strokeDasharray="3 3" className="stroke-brand-primary/45" />
          <rect x="66" y="46" width="12" height="34" rx="3" strokeWidth="1.5" strokeDasharray="3 3" className="stroke-brand-primary/45" />
          <rect x="88" y="52" width="12" height="28" rx="3" strokeWidth="1.5" strokeDasharray="3 3" className="stroke-brand-primary/45" />
          <rect x="110" y="36" width="12" height="44" rx="3" strokeWidth="1.5" strokeDasharray="3 3" className="stroke-brand-primary/45" />
          <circle cx="116" cy="30" r="9" className="fill-white stroke-brand-primary" strokeWidth="2" />
          <path d="M112.5 30h7" strokeWidth="2" strokeLinecap="round" className="stroke-brand-primary" />
        </>
      ) : null}
      {variant === "donut" ? (
        <>
          <circle cx="80" cy="56" r="34" strokeWidth="14" className="stroke-brand-tint" />
          <circle cx="80" cy="56" r="34" strokeWidth="14" strokeDasharray="22 192" strokeLinecap="round" transform="rotate(-90 80 56)" className="stroke-brand-primary/60" />
          <circle cx="80" cy="56" r="17" className="fill-white" />
          <path d="M74 56h12" strokeWidth="2" strokeLinecap="round" className="stroke-brand-primary/55" />
        </>
      ) : null}
      {variant === "documents" ? (
        <>
          <rect x="40" y="22" width="64" height="78" rx="9" transform="rotate(-7 40 22)" className="fill-brand-tint" />
          <rect x="54" y="16" width="64" height="80" rx="9" className="fill-white stroke-brand-primary/40" strokeWidth="1.5" />
          <path d="M66 36h30M66 48h40M66 60h26" strokeWidth="2" strokeLinecap="round" className="stroke-brand-primary/30" />
          <circle cx="112" cy="84" r="14" className="fill-brand-primary" />
          <path d="M105.5 84.5l4.5 4.5 8-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : null}
      {variant === "search" ? (
        <>
          <rect x="28" y="20" width="84" height="64" rx="10" className="fill-brand-tint" />
          <path d="M44 38h40M44 52h52M44 66h30" strokeWidth="2" strokeLinecap="round" className="stroke-brand-primary/30" />
          <circle cx="112" cy="72" r="20" className="fill-white stroke-brand-primary" strokeWidth="2.5" />
          <path d="M127 87l11 11" strokeWidth="4" strokeLinecap="round" className="stroke-brand-primary" />
          <path d="M104 72h16" strokeWidth="2.5" strokeLinecap="round" className="stroke-brand-primary/50" />
        </>
      ) : null}
    </svg>
  );
}
