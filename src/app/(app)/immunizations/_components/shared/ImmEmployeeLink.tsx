"use client";

import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { ImmAvatar } from "./ImmVisuals";

/** Link to the OH employee record. Safe inside clickable rows. */
export function ImmEmployeeLink({ uuid }: { uuid: string }) {
  return (
    <Link
      href={ROUTES.occupationalHealthEmployee(uuid)}
      onClick={(event) => event.stopPropagation()}
      className="inline-flex items-center gap-2 font-mono text-[12px] text-brand-primary hover:underline"
    >
      <ImmAvatar text={uuid} />
      {uuid.slice(0, 8)}
    </Link>
  );
}
