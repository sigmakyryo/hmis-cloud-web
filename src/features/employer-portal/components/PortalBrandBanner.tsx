import type { PortalBranding } from "@/features/employer-portal/services/employer-portal.service";

export function PortalBrandBanner({ branding, fallback }: { branding: PortalBranding | null | undefined; fallback: string }) {
  return (
    <div
      className="mb-6 flex items-center gap-3 border-b pb-4"
      data-testid="employer-portal-brand-banner"
      style={branding?.accent_color ? { borderColor: branding.accent_color } : undefined}
    >
      {branding?.logo_data_uri ? (
        // eslint-disable-next-line @next/next/no-img-element -- inline data URI logo set by the clinic
        <img src={branding.logo_data_uri} alt="" className="h-9 w-auto" />
      ) : null}
      <div>
        <p className="text-[15px] font-semibold text-brand-navy">{branding?.display_name || fallback}</p>
        {branding?.welcome_text ? <p className="text-[13px] text-dash-muted">{branding.welcome_text}</p> : null}
      </div>
    </div>
  );
}
