"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { OrganizationFieldRow } from "@/features/settings/components/OrganizationTabContent";
import { SettingsContentSkeleton } from "@/features/settings/components/SettingsContentSkeleton";
import { SettingsSection } from "@/features/settings/components/SettingsPageLayout";
import {
  domainsFromText,
  domainsToText,
  organizationSamlSchema,
  type OrganizationSamlFormValues,
} from "@/features/settings/schemas/organization-saml.schema";
import {
  fetchOrganizationSamlConfig,
  updateOrganizationSamlConfig,
} from "@/features/settings/services/settings.service";
import type { TenantSamlConfig } from "@/features/settings/types/settings.types";
import { useToast } from "@/providers/toast-provider";

function toFormValues(config: TenantSamlConfig): OrganizationSamlFormValues {
  return {
    enabled: Boolean(config.enabled),
    idp_entity_id: config.idp_entity_id ?? "",
    idp_sso_url: config.idp_sso_url ?? "",
    idp_x509_cert: config.idp_x509_cert ?? "",
    email_domains_text: domainsToText(config.email_domains),
    attribute_email: config.attribute_email || "email",
    metadata_url: config.metadata_url ?? "",
  };
}

/** SAML SSO settings — rendered as the last section on Organization → General. */
export function OrganizationSsoSection() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<OrganizationSamlFormValues>({
    resolver: zodResolver(organizationSamlSchema),
    defaultValues: {
      enabled: false,
      idp_entity_id: "",
      idp_sso_url: "",
      idp_x509_cert: "",
      email_domains_text: "",
      attribute_email: "email",
      metadata_url: "",
    },
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const config = await fetchOrganizationSamlConfig();
        if (cancelled) return;
        form.reset(toFormValues(config));
        setHasLoaded(true);
      } catch (error) {
        if (cancelled) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not load SSO settings.",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [form]);

  async function onSubmit(values: OrganizationSamlFormValues) {
    setIsSaving(true);
    try {
      const saved = await updateOrganizationSamlConfig({
        enabled: values.enabled,
        idp_entity_id: values.idp_entity_id,
        idp_sso_url: values.idp_sso_url,
        idp_x509_cert: values.idp_x509_cert,
        email_domains: domainsFromText(values.email_domains_text),
        attribute_email: values.attribute_email || "email",
        metadata_url: values.metadata_url,
      });
      form.reset(toFormValues(saved));
      toast({
        title: "SSO settings saved",
        description: saved.enabled
          ? "Users with matching email domains will be redirected to your IdP."
          : "SAML SSO is disabled for this organization.",
      });
    } catch (error) {
      toast({
        title: "Could not save SSO settings",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SettingsSection
      title="Single sign-on (SAML)"
      description="Staff with matching work email domains sign in through your identity provider, then complete HMIS MFA. Accounts must already exist in this organization."
      flush
    >
      {isLoading && !hasLoaded ? (
        <SettingsContentSkeleton rows={5} />
      ) : loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <Button
              type="submit"
              form="organization-sso-form"
              disabled={isSaving}
              className="h-8 rounded-lg text-[13px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save SSO"
              )}
            </Button>
          </div>
          <Form {...form}>
            <form
              id="organization-sso-form"
              className="space-y-0 divide-y divide-brand-border/70"
              onSubmit={form.handleSubmit((values) => {
                void onSubmit(values);
              })}
            >
              <OrganizationFieldRow
                label="Enable SAML SSO"
                description="When on, matching email domains skip password and redirect to your IdP."
              >
                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          aria-label="Enable SAML SSO"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </OrganizationFieldRow>

              <OrganizationFieldRow
                label="Email domains"
                description="One domain per line (e.g. acme.com). Users must already exist."
              >
                <FormField
                  control={form.control}
                  name="email_domains_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder={"acme.com\nclinics.acme.com"}
                          className="font-mono text-[13px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </OrganizationFieldRow>

              <OrganizationFieldRow label="IdP entity ID">
                <FormField
                  control={form.control}
                  name="idp_entity_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="https://idp.example.com/metadata"
                          className="font-mono text-[13px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </OrganizationFieldRow>

              <OrganizationFieldRow label="IdP SSO URL">
                <FormField
                  control={form.control}
                  name="idp_sso_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="https://idp.example.com/sso"
                          className="font-mono text-[13px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </OrganizationFieldRow>

              <OrganizationFieldRow
                label="IdP X.509 certificate"
                description="PEM or base64 certificate used to verify assertions."
              >
                <FormField
                  control={form.control}
                  name="idp_x509_cert"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          rows={5}
                          placeholder="-----BEGIN CERTIFICATE-----"
                          className="font-mono text-[12px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </OrganizationFieldRow>

              <OrganizationFieldRow
                label="Email attribute"
                description="SAML attribute that carries the user email."
              >
                <FormField
                  control={form.control}
                  name="attribute_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </OrganizationFieldRow>

              <OrganizationFieldRow
                label="Metadata URL"
                description="Optional. Stored for reference; paste fields above for v1."
              >
                <FormField
                  control={form.control}
                  name="metadata_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="https://idp.example.com/metadata.xml"
                          className="font-mono text-[13px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </OrganizationFieldRow>
            </form>
          </Form>
        </>
      )}
    </SettingsSection>
  );
}

/** @deprecated Use OrganizationSsoSection — kept for import path stability. */
export const OrganizationSsoTab = OrganizationSsoSection;
