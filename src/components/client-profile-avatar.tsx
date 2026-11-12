"use client";

import { UserIdenticon } from "@/components/UserIdenticon";
import { cn } from "@/lib/utils";

type ClientProfileAvatarProps = {
  name: string;
  seed: string;
  photoUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
};

/**
 * Resolves client/patient avatar image priority:
 * uploaded photo → DiceBear/identicon → initials.
 */
export function ClientProfileAvatar({
  name,
  seed,
  photoUrl,
  className,
  fallbackClassName,
}: ClientProfileAvatarProps) {
  return (
    <UserIdenticon
      seed={seed}
      name={name}
      imageUrl={photoUrl}
      className={cn(className)}
      fallbackClassName={fallbackClassName}
      fallback="identicon"
    />
  );
}
