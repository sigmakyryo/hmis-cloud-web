"use client";

import { useCallback, useState } from "react";

import type { HpProgram } from "@/features/occupational-health/services/health-programs.service";

/**
 * Device source for pulling health-check results from an audiometer, spirometer
 * or similar. This default always reports "not connected" — no fake readings.
 * Swap `healthCheckDeviceSource` (or pass a source into the hook) when a
 * real adapter is ready; the visit panel already handles the empty state.
 */
export type HealthCheckDeviceStatus = "not_connected" | "connected" | "reading";

export type HealthCheckDevicePullResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; reason: "not_connected" };

export type HealthCheckDeviceSource = {
  status: HealthCheckDeviceStatus;
  pull: (program: HpProgram) => Promise<HealthCheckDevicePullResult>;
};

export const healthCheckDeviceSource: HealthCheckDeviceSource = {
  status: "not_connected",
  pull: async () => ({ ok: false, reason: "not_connected" }),
};

export type HealthCheckDevicePrompt = {
  scope: "panel" | "test";
  program?: HpProgram;
};

export function useHealthCheckDevice(source: HealthCheckDeviceSource = healthCheckDeviceSource) {
  const [prompt, setPrompt] = useState<HealthCheckDevicePrompt | null>(null);

  const pullFromDevice = useCallback(
    async (scope: "panel" | "test", program?: HpProgram) => {
      const result: HealthCheckDevicePullResult = program
        ? await source.pull(program)
        : { ok: false, reason: "not_connected" };
      if (!result.ok && result.reason === "not_connected") {
        setPrompt({ scope, program });
      }
      return result;
    },
    [source],
  );

  const dismiss = useCallback(() => setPrompt(null), []);

  return { status: source.status, prompt, pullFromDevice, dismiss };
}
