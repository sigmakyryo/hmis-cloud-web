import { permanentRedirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";

/** Biological incidents now live under Exposure management. */
export default function Page() {
  permanentRedirect(ROUTES.exposureManagementIncidents);
}
