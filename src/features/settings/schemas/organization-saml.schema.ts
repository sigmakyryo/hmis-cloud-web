import { z } from "zod";

export const organizationSamlSchema = z.object({
  enabled: z.boolean(),
  idp_entity_id: z.string().trim(),
  idp_sso_url: z.string().trim(),
  idp_x509_cert: z.string().trim(),
  email_domains_text: z.string(),
  attribute_email: z.string().trim().min(1, "Attribute name is required."),
  metadata_url: z.string().trim(),
});

export type OrganizationSamlFormValues = z.infer<typeof organizationSamlSchema>;

export function domainsFromText(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((part) => part.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

export function domainsToText(domains: string[] | undefined): string {
  return (domains ?? []).join("\n");
}
