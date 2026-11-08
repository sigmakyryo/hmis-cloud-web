"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { SecondaryButton } from "@/components/ui/app-buttons";
import { EmptyState } from "@/components/ui/empty-state";
import { CertificateStudio } from "@/features/oh-template-builder/components/CertificateStudio";
import type { BuilderMode } from "@/features/oh-template-builder/components/TemplateBuilderTopBar";
import { TemplateBuilderProvider } from "@/features/oh-template-builder/hooks/useTemplateBuilder";
import { TEMPLATE_KIND_META, templateGalleryHref } from "@/features/oh-template-builder/lib/templateKinds";
import type { TemplateKind } from "@/features/oh-template-builder/template-builder.types";
import { useUser } from "@/providers/user-provider";

type TemplateBuilderPageProps = { kind: TemplateKind; templateUuid: string; view: BuilderMode };

export function TemplateBuilderPage({ kind, templateUuid, view }: TemplateBuilderPageProps) {
  const { userData } = useUser();

  if (!userData?.is_admin) {
    return (
      <CenteredState>
        <EmptyState
          icon={ShieldAlert}
          title="Administrator access required"
          description="Only tenant administrators can edit occupational health templates."
          action={<BackButton kind={kind} />}
        />
      </CenteredState>
    );
  }

  return (
    <TemplateBuilderProvider kind={kind} templateUuid={templateUuid}>
      <CertificateStudio view={view} />
    </TemplateBuilderProvider>
  );
}

function CenteredState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center bg-dash-canvas px-6">
      <div className="w-full max-w-md rounded-2xl border border-dash-border bg-white">
        {children}
      </div>
    </div>
  );
}

function BackButton({ kind }: { kind: TemplateKind }) {
  return (
    <SecondaryButton asChild>
      <Link href={templateGalleryHref(kind)}>
        Back to {TEMPLATE_KIND_META[kind].pluralLabel.toLowerCase()}
      </Link>
    </SecondaryButton>
  );
}
