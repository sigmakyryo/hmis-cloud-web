import { NextResponse } from "next/server";

import { CLINICAL_OPD_API_PATHS } from "@/constants/clinical-opd-api";
import { bffError } from "@/lib/server/bff-response";
import { hmisApiBinaryRequest } from "@/lib/server/hmis-api-binary";
import { requireAccessToken } from "@/lib/server/require-access-token";

type RouteContext = {
  params: Promise<{
    visitUuid: string;
    encounterUuid: string;
    documentUuid: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) {
      return auth.error;
    }

    const { visitUuid, encounterUuid, documentUuid } = await context.params;
    const file = await hmisApiBinaryRequest(
      CLINICAL_OPD_API_PATHS.encounterExternalCareDocumentDownload(
        visitUuid,
        encounterUuid,
        documentUuid,
      ),
      { token: auth.accessToken },
    );
    const filename =
      file.filename && file.filename !== "report.csv" ? file.filename : "document";

    return new NextResponse(file.body, {
      status: 200,
      headers: {
        "Content-Type": file.contentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return bffError(error);
  }
}
