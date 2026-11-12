import Link from "next/link";
import { Loader2, RefreshCw } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";

type Props = {
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
  onAction?: () => void;
  needsAdministrator?: boolean;
  refreshing: boolean;
  onRecheck: () => void;
  error?: string | null;
};

export function OhExaminationSetupState({ title, description, href, actionLabel, onAction, needsAdministrator, refreshing, onRecheck, error }: Props) {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center px-6 py-10 text-center" aria-label="Examination setup">
      <svg viewBox="0 0 180 132" className="mb-5 h-28 w-40 text-brand-primary" aria-hidden="true" focusable="false">
        <ellipse cx="90" cy="118" rx="60" ry="7" fill="currentColor" opacity=".06" />
        <circle cx="90" cy="63" r="54" fill="currentColor" opacity=".05" />
        <rect x="51" y="22" width="78" height="91" rx="12" fill="white" stroke="currentColor" strokeOpacity=".22" strokeWidth="2" />
        <rect x="73" y="15" width="34" height="16" rx="6" fill="currentColor" opacity=".16" />
        <path d="M68 48h43M68 62h32M68 76h21" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity=".2" />
        <circle cx="126" cy="91" r="22" fill="white" stroke="currentColor" strokeOpacity=".25" strokeWidth="2" />
        <path d="M126 82v18m-9-9h18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="m37 45 4 4 8-9m90 4h10m-5-5v10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".4" />
      </svg>
      <h2 className="text-base font-semibold text-brand-navy">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-dash-muted">{description}</p>
      {needsAdministrator ? <p className="mt-2 text-sm text-dash-muted">Ask your administrator to finish this setup, then check again here.</p> : null}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {href && actionLabel ? <PrimaryButton asChild><Link href={href} target="_blank" rel="noopener noreferrer">{actionLabel}<span className="sr-only"> (opens in a new tab)</span></Link></PrimaryButton> : onAction && actionLabel ? <PrimaryButton type="button" onClick={onAction}>{actionLabel}</PrimaryButton> : null}
        <SecondaryButton type="button" onClick={onRecheck} disabled={refreshing}>
          {refreshing ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="mr-2 size-4" aria-hidden="true" />}
          {refreshing ? "Checking…" : "Check again"}
        </SecondaryButton>
      </div>
      {href ? <p className="mt-3 text-xs text-dash-muted">Setup opens in a new tab so you can keep this visit open.</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
