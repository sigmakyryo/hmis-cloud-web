import { describe, expect, it } from "vitest";

import {
  domainsFromText,
  domainsToText,
} from "@/features/settings/schemas/organization-saml.schema";

describe("organization saml domain helpers", () => {
  it("parses domains from multiline and comma text", () => {
    expect(domainsFromText("Acme.com\n @clinics.acme.com, other.org ")).toEqual([
      "acme.com",
      "clinics.acme.com",
      "other.org",
    ]);
  });

  it("serializes domains back to text", () => {
    expect(domainsToText(["acme.com", "other.org"])).toBe("acme.com\nother.org");
  });
});
