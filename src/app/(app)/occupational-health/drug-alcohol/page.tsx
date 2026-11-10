import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

/** Legacy OH path — Drug & Alcohol is now a top-level sidebar module. */
export default function LegacyOhDrugAlcoholRedirect() {
  redirect(ROUTES.drugAlcoholDue);
}
