"use client";

import type { ReactNode } from "react";

import type { AppIconName } from "@/components/icons/app-icon";
import { ListPageBlankState } from "@/features/app-shell/components/page-layout";

export function EmptyAction({
  title,
  description,
  icon = "clipboard",
  action,
}: {
  title: string;
  description: string;
  icon?: AppIconName;
  action?: ReactNode;
}) {
  return <ListPageBlankState compact icon={icon} title={title} description={description} action={action} />;
}
