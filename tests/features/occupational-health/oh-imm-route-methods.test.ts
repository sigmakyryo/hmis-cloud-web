import { describe, expect, it } from "vitest";

import * as accommodations from "@/app/api/occupational-health/immunisation/accommodations/route";
import * as taskAssignments from "@/app/api/occupational-health/immunisation/task-assignments/route";

// The BFF must only expose the methods OHS serves (routes/api.php), so a wrong call is a
// clean 405 from Next instead of an upstream 405/404 surfaced as a server error.
describe("immunisation BFF method allowlist matches OHS", () => {
  it("accommodations is read-only", () => {
    expect(typeof accommodations.GET).toBe("function");
    expect("POST" in accommodations).toBe(false);
  });

  it("task assignments only accepts POST", () => {
    expect(typeof taskAssignments.POST).toBe("function");
    expect("GET" in taskAssignments).toBe(false);
  });
});
