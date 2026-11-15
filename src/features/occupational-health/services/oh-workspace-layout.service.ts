import { bffRequest } from "@/lib/bff-client";
import {
  orderedWorkspaceAreas,
  type OhWorkspaceArea,
} from "@/features/occupational-health/lib/oh-workspace-layout";

export type OhWorkspaceLayout = {
  included: OhWorkspaceArea[];
};

const WORKSPACE_LAYOUT_URL = "/api/occupational-health/workspace-layout";

function layoutFromPayload(payload: { included?: unknown }): OhWorkspaceLayout {
  if (!Array.isArray(payload.included)) {
    throw new Error("Workspace layout response was incomplete.");
  }
  return {
    included: orderedWorkspaceAreas(payload.included.filter((area) => typeof area === "string")),
  };
}

export async function fetchOhWorkspaceLayout(): Promise<OhWorkspaceLayout> {
  const payload = await bffRequest<{ included?: unknown }>(WORKSPACE_LAYOUT_URL);
  return layoutFromPayload(payload);
}

export async function updateOhWorkspaceLayout(
  included: readonly OhWorkspaceArea[],
): Promise<OhWorkspaceLayout> {
  const payload = await bffRequest<{ included?: unknown }>(WORKSPACE_LAYOUT_URL, {
    method: "PUT",
    body: { included: orderedWorkspaceAreas(included) },
  });
  return layoutFromPayload(payload);
}
