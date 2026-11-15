"use client";

import { CalendarClock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { ROUTES } from "@/constants/routes";
import {
  OhHpMonthlySection,
  OhHpOutcomesSection,
  OhHpReferralsSection,
} from "@/features/occupational-health/components/oh-home/views/OhHealthProgramsSections";
import { ViewGrid } from "@/features/occupational-health/components/oh-home/views/OhViewCharts";
import { useOhHomeSummary } from "@/features/occupational-health/components/oh-home/views/useOhHomeSummary";
import {
  FigureStrip,
  QueryState,
  StripCell,
  ViewSection,
} from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import {
  OH_MODULE_ACCENT,
  OhPageGlyph,
} from "@/features/occupational-health/lib/oh-module-visuals";
import {
  fetchHpDue,
  HP_PROGRAMS,
  type HpProgram,
} from "@/features/occupational-health/services/health-programs.service";
import { cn } from "@/lib/utils";

const PROGRAM: Record<HpProgram, { label: string; href: string }> = {
  hearing: { label: "Hearing", href: ROUTES.healthProgramsHearing },
  lung: { label: "Lung function", href: ROUTES.healthProgramsLung },
  vision: { label: "Vision", href: ROUTES.healthProgramsVision },
  ergonomics: { label: "Ergonomics", href: ROUTES.healthProgramsErgonomics },
  fatigue: { label: "Fatigue", href: ROUTES.healthProgramsFatigue },
};

/** Health programmes: who is due, programme by programme. */
export function OhHealthProgramsView() {
  const due = useQuery({
    queryKey: ["oh-home", "hp-due"],
    queryFn: () => fetchHpDue(),
    staleTime: 60_000,
  });
  const home = useOhHomeSummary("health-programs");
  const counts = due.data?.counts ?? {};

  return (
    <div className="space-y-10" data-testid="oh-home-view-health-programs">
      <ViewSection
        title="Due for screening" icon={CalendarClock} countLabel="workers due"
        count={due.isSuccess ? (counts.total ?? 0) : undefined}
        href={ROUTES.healthProgramsDue}
        linkLabel="Everyone due"
      >
        <QueryState
          isLoading={due.isLoading}
          isError={due.isError}
          onRetry={() => void due.refetch()}
          rows={2}
        >
          <p className="mb-3 text-[13.5px] text-dash-muted">
            <span
              className={cn(
                "font-semibold tabular-nums",
                (counts.overdue ?? 0) > 0 ? "text-red-700" : "text-brand-navy",
              )}
            >
              {counts.overdue ?? 0}
            </span>{" "}
            overdue,{" "}
            <span className="font-semibold text-brand-navy tabular-nums">
              {counts.never ?? 0}
            </span>{" "}
            never tested, and{" "}
            <span className="font-semibold text-brand-navy tabular-nums">
              {counts.due ?? 0}
            </span>{" "}
            due soon.
          </p>
          <FigureStrip>
            {HP_PROGRAMS.map((program) => (
              <StripCell
                key={program}
                testId="oh-home-hp-lane"
                icon={
                  <OhPageGlyph
                    href={PROGRAM[program].href}
                    ohModule="HealthPrograms"
                    className={cn(
                      "size-4",
                      OH_MODULE_ACCENT.HealthPrograms.icon,
                    )}
                  />
                }
                label={PROGRAM[program].label}
                value={counts[program] ?? 0}
                hint="due"
                href={PROGRAM[program].href}
              />
            ))}
          </FigureStrip>
        </QueryState>
      </ViewSection>
      <ViewGrid>
        <OhHpMonthlySection summary={home} />
        <OhHpOutcomesSection summary={home} />
      </ViewGrid>
      <OhHpReferralsSection summary={home} />
    </div>
  );
}
