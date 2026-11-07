"use client";

import { useMemo } from "react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { createIdenticonDataUri } from "@/lib/dicebear-identicon";
import { cn } from "@/lib/utils";

type UserIdenticonProps = {
  seed: string;
  name: string;
  imageUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
  /** When no photo is set: dicebear pattern (default) or letter initials. */
  fallback?: "identicon" | "initials";
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserIdenticon({
  seed,
  name,
  imageUrl,
  className,
  fallbackClassName,
  fallback = "identicon",
}: UserIdenticonProps) {
  const photoUrl = imageUrl?.trim() || null;
  const identiconSrc = useMemo(
    () => (fallback === "identicon" ? createIdenticonDataUri(seed) : null),
    [fallback, seed],
  );
  const avatarSrc = photoUrl || identiconSrc;

  return (
    <Avatar className={cn("size-8 rounded-lg", className)}>
      {avatarSrc ? (
        <AvatarImage
          src={avatarSrc}
          alt={name}
          className={photoUrl ? "object-cover" : undefined}
        />
      ) : null}
      <AvatarFallback className={cn("rounded-lg text-xs", fallbackClassName)}>
        {getInitials(name) || "?"}
      </AvatarFallback>
    </Avatar>
  );
}
