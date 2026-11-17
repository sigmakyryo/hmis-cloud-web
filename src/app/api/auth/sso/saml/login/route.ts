import { AUTH_API_PATHS } from "@/constants/auth-api";
import { HMIS_API_URL } from "@/constants/api";
import { NextResponse } from "next/server";

/**
 * Same-origin entry that 302s to the Django SAML login start URL.
 * Keeps the browser on the app origin until the IdP redirect.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = (searchParams.get("email") || "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ message: "Email is required." }, { status: 400 });
  }

  const target = new URL(
    `${HMIS_API_URL.replace(/\/$/, "")}${AUTH_API_PATHS.ssoSamlLogin}`,
  );
  target.searchParams.set("email", email);
  return NextResponse.redirect(target.toString(), 302);
}
