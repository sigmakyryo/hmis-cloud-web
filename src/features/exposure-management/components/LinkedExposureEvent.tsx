"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { ROUTES } from "@/constants/routes";
import { SeverityBadge } from "@/features/exposure-management/components/ExposureBadges";
import { exposureKeys, fetchEventForIod } from "@/features/exposure-management/services/exposure.service";

/** Shown on an injury on duty case when it was opened from an overexposure event. Renders nothing otherwise. */
export function LinkedExposureEvent({ iodCaseUuid, wrap }: { iodCaseUuid: string; wrap?: (content: ReactNode) => ReactNode }) {
  const query = useQuery({ queryKey: exposureKeys.eventForIod(iodCaseUuid), queryFn: () => fetchEventForIod(iodCaseUuid), retry: false });
  const event = query.data;
  if (!event) return null;
  const content = (
    <div className="space-y-1.5 text-[13px]" data-testid="oh-iod-linked-exposure">
      <div className="flex items-center gap-2">
        <SeverityBadge severity={event.severity} />
        <span className="text-brand-navy">{event.agent_name}</span>
      </div>
      <Link href={`${ROUTES.exposureManagementEvents}?event=${event.uuid}`} className="inline-block font-medium text-brand-primary hover:underline">
        Open the exposure event
      </Link>
    </div>
  );
  return wrap ? wrap(content) : content;
}
