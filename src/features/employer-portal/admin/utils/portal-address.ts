/** Words of an organisation name, safe in a portal address. Mirrors the Django `workspace_slug`. */
export function portalWorkspaceSlug(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "workspace";
}

/** `<organisation-name>-<id>`. The id is what the portal looks up, the name is for people. */
export function portalWorkspaceKey(name: string, id: number): string {
  return `${portalWorkspaceSlug(name)}-${id}`;
}

export function portalPath(name: string, id: number): string {
  return `/portal/${portalWorkspaceKey(name, id)}`;
}
