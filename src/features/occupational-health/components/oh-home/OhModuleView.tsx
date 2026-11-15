"use client";

import { ROUTES } from "@/constants/routes";
import { OhHomePageIndex } from "@/features/occupational-health/components/oh-home/OhHomePageIndex";
import { OhClinicView } from "@/features/occupational-health/components/oh-home/views/OhClinicView";
import { OhDrugAlcoholView } from "@/features/occupational-health/components/oh-home/views/OhDrugAlcoholView";
import { OhExposureView } from "@/features/occupational-health/components/oh-home/views/OhExposureView";
import { OhFitnessView } from "@/features/occupational-health/components/oh-home/views/OhFitnessView";
import { OhHealthProgramsView } from "@/features/occupational-health/components/oh-home/views/OhHealthProgramsView";
import { OhImmunizationsView } from "@/features/occupational-health/components/oh-home/views/OhImmunizationsView";
import { OhViewModuleContext } from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import type { OhModule } from "@/features/occupational-health/lib/oh-modules";

function ModuleWork({ ohModule }: { ohModule: OhModule }) {
  switch (ohModule.key) {
    case "OccupationalHealth":
      return <OhClinicView />;
    case "Immunizations":
      return <OhImmunizationsView />;
    case "DrugAlcohol":
      return <OhDrugAlcoholView />;
    case "Fitness":
      return <OhFitnessView />;
    case "HealthPrograms":
      return <OhHealthProgramsView />;
    case "ExposureManagement":
      return <OhExposureView />;
  }
}

/** Each module opens on its own work, with the module's pages listed down the side. */
export function OhModuleView({ ohModule }: { ohModule: OhModule }) {
  return (
    <OhViewModuleContext.Provider value={ohModule.key}>
    <section
      aria-label={ohModule.label}
      data-testid="oh-home-module-detail"
      className="@container mx-auto w-full max-w-6xl"
    >
      <h2 className="sr-only">{ohModule.label}</h2>
      <div className="space-y-10">
        <ModuleWork ohModule={ohModule} />
        <OhHomePageIndex ohModule={ohModule} exclude={[ROUTES.occupationalHealth]} />
      </div>
    </section>
    </OhViewModuleContext.Provider>
  );
}
