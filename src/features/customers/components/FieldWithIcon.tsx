import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type FieldWithIconProps = {
  icon: LucideIcon;
  children: ReactNode;
};

export const fieldIconPaddingClassName = "pl-9";

export function FieldWithIcon({ icon: Icon, children }: FieldWithIconProps) {
  return (
    <div className="relative">
      <Icon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-dash-muted"
      />
      {children}
    </div>
  );
}
