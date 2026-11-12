import Link from "next/link";
import type { ReactNode } from "react";

import { ROUTES } from "@/constants/routes";

type Kind = Parameters<typeof ROUTES.occupationalHealthRecord>[0];

/** Link to the detail / edit page of one OH record. */
export function OhRecordLink({ kind, uuid, children }: { kind: Kind; uuid: string; children?: ReactNode }) {
  return (
    <Link
      href={ROUTES.occupationalHealthRecord(kind, uuid)}
      className="text-xs font-medium text-brand-blue underline-offset-2 hover:underline"
      data-testid={`oh-record-link-${kind}`}
    >
      {children ?? "Open"}
    </Link>
  );
}
