"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOpdEncounterWorkspace } from "@/features/clinical-opd/components/detail/opd-encounter-workspace-context";
import { TheatreAnaesthesiaPanel } from "@/features/clinical-theatre/components/TheatreAnaesthesiaPanel";
import { TheatreCaseActions } from "@/features/clinical-theatre/components/TheatreCaseActions";
import { TheatreCaseDetailsForm } from "@/features/clinical-theatre/components/TheatreCaseDetailsForm";
import { TheatreCasePanelGate } from "@/features/clinical-theatre/components/TheatreCasePanelGate";
import { TheatreChecklistPanel } from "@/features/clinical-theatre/components/TheatreChecklistPanel";
import { TheatreConsumablesPanel } from "@/features/clinical-theatre/components/TheatreConsumablesPanel";
import { TheatreOperationNotePanel } from "@/features/clinical-theatre/components/TheatreOperationNotePanel";
import { TheatrePreOpPanel } from "@/features/clinical-theatre/components/TheatrePreOpPanel";
import { TheatreRecoveryPanel } from "@/features/clinical-theatre/components/TheatreRecoveryPanel";
import { TheatreSafetyBadges } from "@/features/clinical-theatre/components/TheatreSafetyBadges";
import { TheatreTeamPanel } from "@/features/clinical-theatre/components/TheatreTeamPanel";
import type { TheatreCase } from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  THEATRE_INTRA_OP_SECTIONS,
  defaultIntraOpSection,
  isIntraOpSection,
  type TheatreIntraOpSection,
} from "@/features/clinical-theatre/utils/theatre-workflow";
import type { ClinicalWorkspacePanelProps } from "@/features/clinical-workspace/types/clinical-workspace.types";
import { cn } from "@/lib/utils";

function SectionShell({ children, testId }: { children: ReactNode; testId: string }) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-4 sm:px-6" data-testid={testId}>
      {children}
    </div>
  );
}

/** Card around one block; panels that carry their own heading omit `title`. */
function SectionCard({
  title,
  children,
  action,
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card>
      {title ? (
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-4 pb-3">
          <CardTitle className="text-base font-semibold text-brand-navy">{title}</CardTitle>
          {action}
        </CardHeader>
      ) : null}
      <CardContent className={title ? "p-4 pt-0" : "p-4"}>{children}</CardContent>
    </Card>
  );
}

function useCan() {
  const { capabilities } = useOpdEncounterWorkspace();
  return (capability: string) => capabilities.includes(capability);
}

/** Overview: case details, schedule and room, and the surgical team. */
export function TheatreOverviewSection({ encounterUuid }: ClinicalWorkspacePanelProps) {
  const can = useCan();
  return (
    <SectionShell testId="theatre-section-overview">
      <TheatreCasePanelGate encounterUuid={encounterUuid}>
        {(theatreCase) => (
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="Case details"
              action={<TheatreSafetyBadges safety={theatreCase.safety} />}
            >
              <TheatreCaseDetailsForm
                key={`${theatreCase.uuid}-${theatreCase.updated_at}`}
                theatreCase={theatreCase}
                canEdit={can("book_theatre_case")}
              />
            </SectionCard>
            <SectionCard title="Schedule & room">
              {can("transition_theatre_case") ? (
                <TheatreCaseActions theatreCase={theatreCase} transitions="secondary" />
              ) : (
                <p className="text-sm text-muted-foreground">
                  You can view the slot in the header. Ask a theatre coordinator to
                  change it.
                </p>
              )}
            </SectionCard>
            <div className="lg:col-span-2">
              <SectionCard>
                <TheatreTeamPanel theatreCase={theatreCase} />
              </SectionCard>
            </div>
          </div>
        )}
      </TheatreCasePanelGate>
    </SectionShell>
  );
}

/** Pre-op: assessment and consent, then the WHO sign-in. */
export function TheatrePreOpSection({ encounterUuid }: ClinicalWorkspacePanelProps) {
  return (
    <SectionShell testId="theatre-section-pre-op">
      <TheatreCasePanelGate encounterUuid={encounterUuid}>
        {(theatreCase) => (
          <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
            <SectionCard>
              <TheatrePreOpPanel theatreCase={theatreCase} />
            </SectionCard>
            <SectionCard>
              <TheatreChecklistPanel
                theatreCase={theatreCase}
                stages={["sign_in"]}
                title="WHO sign-in"
              />
            </SectionCard>
          </div>
        )}
      </TheatreCasePanelGate>
    </SectionShell>
  );
}

function IntraOpBody({
  theatreCase,
  section,
}: {
  theatreCase: TheatreCase;
  section: TheatreIntraOpSection;
}) {
  switch (section) {
    case "anaesthesia":
      return <TheatreAnaesthesiaPanel theatreCase={theatreCase} />;
    case "op-note":
      return <TheatreOperationNotePanel theatreCase={theatreCase} />;
    case "consumables":
      return <TheatreConsumablesPanel theatreCase={theatreCase} />;
    default:
      return (
        <TheatreChecklistPanel
          theatreCase={theatreCase}
          stages={["time_out", "sign_out"]}
          title="WHO time-out & sign-out"
        />
      );
  }
}

/** Intra-op: time-out / sign-out, anaesthesia, op note and consumables. */
export function TheatreIntraOpSection({ encounterUuid }: ClinicalWorkspacePanelProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams.get("section");
  return (
    <SectionShell testId="theatre-section-intra-op">
      <TheatreCasePanelGate encounterUuid={encounterUuid}>
        {(theatreCase) => {
          const active = isIntraOpSection(requested)
            ? requested
            : defaultIntraOpSection(theatreCase.status);
          return (
            <div className="space-y-4">
              <nav
                aria-label="Intra-op sections"
                className="inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1"
              >
                {THEATRE_INTRA_OP_SECTIONS.map((item) => (
                  <Link
                    key={item.id}
                    href={`${pathname}?section=${item.id}`}
                    scroll={false}
                    aria-current={active === item.id ? "page" : undefined}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium",
                      active === item.id
                        ? "bg-white text-brand-navy shadow-sm"
                        : "text-brand-muted hover:text-brand-navy",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <SectionCard>
                <IntraOpBody theatreCase={theatreCase} section={active} />
              </SectionCard>
            </div>
          );
        }}
      </TheatreCasePanelGate>
    </SectionShell>
  );
}

/** Recovery: PACU observations, Aldrete score and discharge. */
export function TheatreRecoverySection({ encounterUuid }: ClinicalWorkspacePanelProps) {
  return (
    <SectionShell testId="theatre-section-recovery">
      <TheatreCasePanelGate encounterUuid={encounterUuid}>
        {(theatreCase) => (
          <SectionCard>
            <TheatreRecoveryPanel theatreCase={theatreCase} />
          </SectionCard>
        )}
      </TheatreCasePanelGate>
    </SectionShell>
  );
}
