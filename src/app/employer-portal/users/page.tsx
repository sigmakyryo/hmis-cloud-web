import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";

/** The users page is now Employees. Keeps old bookmarks working. */
export default function Page() {
  redirect(ROUTES.employerPortalEmployees);
}
