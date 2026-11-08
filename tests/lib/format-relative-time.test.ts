import { describe, expect, it } from "vitest";

import {
  formatLastVisitBadgeLabel,
  formatLastVisitDetailLabel,
  formatRelativeTime,
} from "@/lib/format-relative-time";

describe("formatRelativeTime", () => {
  const now = new Date("2026-11-08T12:00:00.000Z");

  it("formats compact hours and days", () => {
    expect(
      formatRelativeTime("2026-11-08T10:00:00.000Z", { style: "compact", now }),
    ).toBe("2h ago");
    expect(
      formatRelativeTime("2026-11-06T12:00:00.000Z", { style: "compact", now }),
    ).toBe("2 days ago");
  });

  it("formats long hours", () => {
    expect(
      formatRelativeTime("2026-11-08T10:00:00.000Z", { style: "long", now }),
    ).toBe("2 hours ago");
  });
});

describe("last visit labels", () => {
  const now = new Date("2026-11-08T12:00:00.000Z");

  it("builds badge and detail copy", () => {
    expect(
      formatLastVisitBadgeLabel("2026-11-08T10:00:00.000Z", { now }),
    ).toBe("Last visit 2h ago");
    expect(
      formatLastVisitDetailLabel("2026-11-08T10:00:00.000Z", { now }),
    ).toBe("2 hours ago");
  });

  it("handles never visited", () => {
    expect(formatLastVisitBadgeLabel(null)).toBe("No visits");
    expect(formatLastVisitDetailLabel(undefined)).toBe("No visits yet");
  });
});
