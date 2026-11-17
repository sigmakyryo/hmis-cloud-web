import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  getWorkspaceAvatarTone,
  getWorkspaceInitials,
  WorkspaceAvatar,
} from "@/components/workspace-avatar";

describe("getWorkspaceInitials", () => {
  it("uses the first two words of a multi-word name", () => {
    expect(getWorkspaceInitials("Princeton-Plainsboro")).toBe("PP");
    expect(getWorkspaceInitials("Walk-in Clinic")).toBe("WC");
    expect(getWorkspaceInitials("Diagnostics Department")).toBe("DD");
  });

  it("uses the first two letters of a single word", () => {
    expect(getWorkspaceInitials("Sigma")).toBe("SI");
  });

  it("falls back when the name is empty", () => {
    expect(getWorkspaceInitials("   ")).toBe("?");
  });
});

describe("getWorkspaceAvatarTone", () => {
  it("picks a stable tinted tone for a workspace name", () => {
    const tone = getWorkspaceAvatarTone("Princeton-Plainsboro");

    expect(tone.bg).toContain("linear-gradient");
    expect(tone.text).toMatch(/^text-\[#/);
    expect(tone.ring).toMatch(/^ring-\[#/);
    expect(getWorkspaceAvatarTone("Princeton-Plainsboro")).toEqual(tone);
  });

  it("can assign different tones to different workspace names", () => {
    const names = [
      "Princeton-Plainsboro",
      "Walk-in Clinic",
      "Diagnostics Department",
      "Sigma",
      "Coastal Wellness",
    ];
    const tones = new Set(names.map((name) => getWorkspaceAvatarTone(name).bg));

    expect(tones.size).toBeGreaterThan(1);
  });
});

describe("WorkspaceAvatar", () => {
  it("renders an image when imageUrl is provided", () => {
    const { container } = render(
      <WorkspaceAvatar
        name="Acme Clinic"
        imageUrl="https://cdn.example.com/logo.png"
      />,
    );
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "https://cdn.example.com/logo.png");
    expect(container).not.toHaveTextContent("AC");
  });

  it("renders initials when imageUrl is missing", () => {
    const { container } = render(<WorkspaceAvatar name="Acme Clinic" />);
    expect(container).toHaveTextContent("AC");
  });
});
