import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

/** Legacy OH path — Immunizations is now a top-level sidebar module. */
export default function LegacyOhImmunizationsRedirect() {
  redirect(ROUTES.immunizationsDue);
}
