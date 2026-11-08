type OhCatalogEmptyIllustrationProps = {
  kind: "risk" | "department" | "role";
};

const SHADOW = "#e0d5c8";
const BORDER = "#e0d5c8";
const PAPER = "#fdf6ee";
const WHITE = "#ffffff";
const TEAL = "#0b6e6e";
const TINT = "#e6f2f2";
const MUTED = "#b8c4be";

export function OhCatalogEmptyIllustration({ kind }: OhCatalogEmptyIllustrationProps) {
  return (
    <svg
      viewBox="0 0 192 132"
      className="h-[7.75rem] w-44"
      aria-hidden="true"
      data-testid={`oh-catalog-empty-illustration-${kind}`}
    >
      <ellipse cx="96" cy="118" rx="44" ry="5" fill={SHADOW} opacity="0.75" />
      {kind === "risk" ? <RiskProfileArt /> : null}
      {kind === "department" ? <DepartmentArt /> : null}
      {kind === "role" ? <JobTitleArt /> : null}
    </svg>
  );
}

function RiskProfileArt() {
  return (
    <>
      <rect x="44" y="24" width="104" height="86" rx="12" fill={PAPER} stroke={BORDER} strokeWidth="1.5" />
      <rect x="52" y="16" width="88" height="86" rx="12" fill={WHITE} stroke={BORDER} strokeWidth="1.5" />
      <rect x="76" y="8" width="40" height="14" rx="5" fill={TEAL} />
      <rect x="86" y="11" width="20" height="8" rx="3" fill={TINT} />
      <rect x="64" y="38" width="64" height="22" rx="6" fill={TINT} stroke={BORDER} strokeWidth="1" />
      <rect x="72" y="46" width="28" height="3" rx="1.5" fill={TEAL} opacity="0.35" />
      <rect x="72" y="52" width="40" height="3" rx="1.5" fill={MUTED} opacity="0.45" />
      <circle cx="118" cy="49" r="7" fill={TEAL} />
      <path
        d="M115 49l2 2 5-5"
        fill="none"
        stroke={WHITE}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="64" y="68" width="64" height="22" rx="6" fill={WHITE} stroke={BORDER} strokeWidth="1" />
      <rect x="72" y="76" width="24" height="3" rx="1.5" fill={MUTED} opacity="0.45" />
      <rect x="72" y="82" width="36" height="3" rx="1.5" fill={MUTED} opacity="0.35" />
      <rect x="108" y="74" width="12" height="12" rx="3" fill={TINT} stroke={TEAL} strokeWidth="1" />
    </>
  );
}

function DepartmentArt() {
  return (
    <>
      <path
        d="M96 72v10M68 82h56M68 82v6M124 82v6"
        stroke={BORDER}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect x="48" y="88" width="44" height="28" rx="7" fill={WHITE} stroke={BORDER} strokeWidth="1.5" />
      <rect x="56" y="96" width="28" height="3" rx="1.5" fill={MUTED} opacity="0.5" />
      <rect x="56" y="102" width="20" height="3" rx="1.5" fill={TINT} />
      <rect x="100" y="88" width="44" height="28" rx="7" fill={WHITE} stroke={BORDER} strokeWidth="1.5" />
      <rect x="108" y="96" width="28" height="3" rx="1.5" fill={MUTED} opacity="0.5" />
      <rect x="108" y="102" width="24" height="3" rx="1.5" fill={TINT} />
      <rect x="60" y="36" width="72" height="36" rx="10" fill={TEAL} />
      <rect x="68" y="44" width="24" height="4" rx="2" fill={TINT} opacity="0.95" />
      <rect x="68" y="52" width="40" height="4" rx="2" fill={WHITE} opacity="0.35" />
      <rect x="68" y="60" width="32" height="4" rx="2" fill={WHITE} opacity="0.22" />
      <circle cx="124" cy="48" r="5" fill={TINT} />
      <circle cx="68" cy="48" r="5" fill={TINT} />
    </>
  );
}

function JobTitleArt() {
  return (
    <>
      <path
        d="M76 28c0-8 40-8 40 0v6H76v-6z"
        fill={TEAL}
      />
      <rect x="80" y="22" width="32" height="8" rx="4" fill={TINT} />
      <path
        d="M96 34v10"
        stroke={BORDER}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="58" y="44" width="76" height="58" rx="10" fill={WHITE} stroke={BORDER} strokeWidth="1.5" />
      <rect x="58" y="44" width="76" height="14" rx="10" fill={TINT} />
      <rect x="58" y="52" width="76" height="6" fill={TINT} />
      <circle cx="96" cy="74" r="11" fill={TINT} stroke={TEAL} strokeWidth="1.25" />
      <circle cx="96" cy="71" r="4" fill={TEAL} />
      <path
        d="M88 81c1.2-5.5 4.8-9 8-9s6.8 3.5 8 9"
        fill={TEAL}
      />
      <rect x="72" y="92" width="48" height="4" rx="2" fill={MUTED} opacity="0.45" />
      <rect x="80" y="100" width="32" height="3" rx="1.5" fill={TEAL} opacity="0.35" />
    </>
  );
}
