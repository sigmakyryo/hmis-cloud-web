import { describe, expect, it } from "vitest";

import {
  BFF_CLINICAL_THEATRE_ROUTES,
  CLINICAL_THEATRE_API_PATHS,
} from "@/constants/clinical-theatre-api";
import { theatreQueryString } from "@/features/clinical-theatre/services/clinical-theatre.service";
import { buildTheatreQuery } from "@/lib/server/theatre-bff";

describe("theatre API paths", () => {
  it("maps BFF routes to Django theatre endpoints", () => {
    expect(CLINICAL_THEATRE_API_PATHS.cases).toBe("/theatre/cases/");
    expect(CLINICAL_THEATRE_API_PATHS.transition("c1")).toBe(
      "/theatre/cases/c1/transition/",
    );
    expect(CLINICAL_THEATRE_API_PATHS.assignRoom("c1")).toBe(
      "/theatre/cases/c1/assign-room/",
    );
    expect(BFF_CLINICAL_THEATRE_ROUTES.rooms).toBe("/api/theatre/rooms");
    expect(BFF_CLINICAL_THEATRE_ROUTES.reschedule("c1")).toBe(
      "/api/theatre/cases/c1/reschedule",
    );
  });

  it("builds query strings without empty values", () => {
    expect(theatreQueryString({ stay: "s1", room: undefined, include_inactive: false })).toBe(
      "?stay=s1",
    );
    expect(theatreQueryString({ include_inactive: true })).toBe(
      "?include_inactive=true",
    );
    expect(theatreQueryString({})).toBe("");
  });

  it("forwards only known filters upstream", () => {
    const request = new Request(
      "http://app.localhost/api/theatre/cases?status=booked,waiting&stay=s1&evil=1",
    );
    expect(buildTheatreQuery(request)).toBe("?status=booked%2Cwaiting&stay=s1");
  });
});
