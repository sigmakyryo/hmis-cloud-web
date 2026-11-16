"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useMemo, useState } from "react";

import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { errorText } from "@/app/(app)/drug-alcohol/_components/shared/da-format";
import { SecondaryButton } from "@/components/ui/app-buttons";
import {
  fetchPortalBranding,
  savePortalBranding,
  type PortalBranding,
} from "@/features/employer-portal/services/employer-portal.service";
import { useToast } from "@/providers/toast-provider";

const field = "h-9 w-full rounded-md border border-dash-border px-2.5 text-[13px]";

function readDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function PortalBrandingPanel() {
  const { toast } = useToast();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["oh-portal-admin", "branding"], queryFn: fetchPortalBranding, retry: false });
  const [edits, setEdits] = useState<Partial<PortalBranding>>({});
  const form = useMemo(() => ({ ...(query.data ?? {}), ...edits }) as Partial<PortalBranding>, [query.data, edits]);
  const save = useMutation({
    mutationFn: () => savePortalBranding(edits),
    onSuccess: () => {
      toast({ variant: "success", title: "Branding saved" });
      setEdits({});
      void client.invalidateQueries({ queryKey: ["oh-portal-admin", "branding"] });
    },
    onError: (error) => toast({ variant: "error", title: "Not saved", description: errorText(error) }),
  });
  const set = (k: keyof PortalBranding, v: string | null) => setEdits((cur) => ({ ...cur, [k]: v }));

  async function pickLogo(file: File | undefined) {
    if (!file) return;
    if (file.size > 200_000) {
      toast({ variant: "error", title: "Logo too large", description: "Use an image under 200 KB." });
      return;
    }
    set("logo_data_uri", await readDataUri(file));
  }

  if (query.isLoading) return <QuietLoading />;
  if (query.isError) return <LoadError>{errorText(query.error, "Could not load branding.")}</LoadError>;
  return (
    <div className="grid max-w-xl gap-3 text-[13px]" data-testid="oh-portal-branding">
      <label className="space-y-1">
        <span className="text-dash-muted">Name shown to employers</span>
        <input aria-label="Display name" className={field} value={form.display_name ?? ""} onChange={(e) => set("display_name", e.target.value)} />
      </label>
      <label className="space-y-1">
        <span className="text-dash-muted">Accent colour</span>
        <input aria-label="Accent colour" type="color" value={form.accent_color || "#1f6feb"} onChange={(e) => set("accent_color", e.target.value)} />
      </label>
      <label className="space-y-1">
        <span className="text-dash-muted">Logo (PNG, JPEG or SVG, under 200 KB)</span>
        <input aria-label="Logo" type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={(e) => void pickLogo(e.target.files?.[0])} />
      </label>
      {form.logo_data_uri ? (
        <Image src={form.logo_data_uri} alt="Logo preview" width={160} height={40} unoptimized className="h-10 w-auto" />
      ) : null}
      <label className="space-y-1">
        <span className="text-dash-muted">Welcome text on the sign-in and invitation pages</span>
        <textarea aria-label="Welcome text" className="w-full rounded-md border border-dash-border p-2.5" rows={3} value={form.welcome_text ?? ""} onChange={(e) => set("welcome_text", e.target.value)} />
      </label>
      <label className="space-y-1">
        <span className="text-dash-muted">Support email</span>
        <input aria-label="Support email" className={field} value={form.support_email ?? ""} onChange={(e) => set("support_email", e.target.value)} />
      </label>
      <div>
        <SecondaryButton disabled={save.isPending || Object.keys(edits).length === 0} onClick={() => save.mutate()}>
          Save branding
        </SecondaryButton>
      </div>
    </div>
  );
}
