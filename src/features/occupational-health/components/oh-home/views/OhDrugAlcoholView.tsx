"use client";

import { Shuffle, Workflow } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { ROUTES } from "@/constants/routes";
import {
  OhDaMonthSection,
  OhDaReasonSection,
  OhDaRecentSection,
} from "@/features/occupational-health/components/oh-home/views/OhDrugAlcoholSections";
import { ViewGrid } from "@/features/occupational-health/components/oh-home/views/OhViewCharts";
import { useOhHomeSummary } from "@/features/occupational-health/components/oh-home/views/useOhHomeSummary";
import {
  FigureStrip,
  QueryState,
  ShareRow,
  StripCell,
  ViewSection,
} from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import {
  fetchDaCompliance,
  fetchDaDue,
  fetchDaMroQueue,
  fetchDaRtdCases,
} from "@/features/occupational-health/services/drug-alcohol.service";

function StepNumber({ n }: { n: number }) {
  return (
    <span
      aria-hidden
      className="flex size-5 items-center justify-center rounded-full border border-dash-border text-[11px] font-semibold text-dash-muted tabular-nums"
    >
      {n}
    </span>
  );
}

/** Drug & Alcohol: a case moves from due, to the MRO, to return to duty. Random pools run beside it. */
export function OhDrugAlcoholView() {
  const due = useQuery({
    queryKey: ["oh-home", "da-due"],
    queryFn: () => fetchDaDue(14),
    staleTime: 60_000,
  });
  const mro = useQuery({
    queryKey: ["oh-home", "da-mro"],
    queryFn: () => fetchDaMroQueue(false),
    staleTime: 60_000,
  });
  const rtd = useQuery({
    queryKey: ["oh-home", "da-rtd"],
    queryFn: () => fetchDaRtdCases(),
    staleTime: 60_000,
  });
  const random = useQuery({
    queryKey: ["oh-home", "da-random"],
    queryFn: () => fetchDaCompliance(),
    staleTime: 60_000,
  });

  const home = useOhHomeSummary("drug-alcohol");
  const counts = due.data?.counts ?? {};
  const openRtd = (rtd.data ?? []).filter((item) => !item.rtd_passed_at).length;
  const pools = random.data ?? [];

  return (
    <div className="space-y-10" data-testid="oh-home-view-drug-alcohol">
      <ViewSection title="Where cases are" icon={Workflow}>
        <QueryState
          isLoading={due.isLoading || mro.isLoading || rtd.isLoading}
          isError={due.isError || mro.isError || rtd.isError}
          onRetry={() => {
            void due.refetch();
            void mro.refetch();
            void rtd.refetch();
          }}
          rows={2}
        >
          <FigureStrip>
            <StripCell
              testId="oh-home-da-stage"
              icon={<StepNumber n={1} />}
              label="Due for testing"
              value={counts.total ?? due.data?.rows.length ?? 0}
              hint={`${counts.overdue ?? 0} overdue · next 14 days`}
              href={ROUTES.drugAlcoholDue}
              alert={(counts.overdue ?? 0) > 0}
            />
            <StripCell
              testId="oh-home-da-stage"
              icon={<StepNumber n={2} />}
              label="With the MRO"
              value={mro.data?.length ?? 0}
              hint="Results to verify"
              href={ROUTES.drugAlcoholMro}
            />
            <StripCell
              testId="oh-home-da-stage"
              icon={<StepNumber n={3} />}
              label="Returning to duty"
              value={openRtd}
              hint="Open cases"
              href={ROUTES.drugAlcoholRtd}
            />
          </FigureStrip>
        </QueryState>
      </ViewSection>
      <ViewGrid>
        <OhDaMonthSection summary={home} />
        <OhDaReasonSection summary={home} />
      </ViewGrid>
      <ViewGrid>
        <OhDaRecentSection summary={home} />
        <ViewSection
          title="Random testing this year" icon={Shuffle}
          href={ROUTES.drugAlcoholRandom}
          linkLabel="Pools"
        >
          <QueryState
            isLoading={random.isLoading}
            isError={random.isError}
            onRetry={() => void random.refetch()}
            rows={2}
          >
            {pools.length === 0 ? (
              <p className="text-[13.5px] text-dash-muted">
                No random pools are set up.
              </p>
            ) : (
              <ul>
                {pools.slice(0, 5).map((pool) => (
                  <ShareRow
                    key={pool.pool_uuid}
                    name={pool.pool_name}
                    percent={
                      pool.drug_tests_required > 0
                        ? (pool.drug_tests_done / pool.drug_tests_required) *
                          100
                        : 0
                    }
                    note={`${pool.drug_tests_done} of ${pool.drug_tests_required} drug tests${pool.drug_on_track ? "" : " · behind"}`}
                    tone={
                      pool.drug_on_track ? "bg-brand-primary" : "bg-red-600"
                    }
                    alertNote={!pool.drug_on_track}
                  />
                ))}
              </ul>
            )}
          </QueryState>
        </ViewSection>
      </ViewGrid>
    </div>
  );
}
