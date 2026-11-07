import type { ComponentProps } from "react";

import { AppIcon } from "@/components/icons/app-icon";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppButtonProps = ComponentProps<typeof Button>;

export function PrimaryButton({ className, ...props }: AppButtonProps) {
  return <Button variant="primary" className={className} {...props} />;
}

export function SecondaryButton({ className, ...props }: AppButtonProps) {
  return <Button variant="outline" className={className} {...props} />;
}

export function DestructiveButton({ className, ...props }: AppButtonProps) {
  return <Button variant="destructive" className={className} {...props} />;
}

type AddActionButtonProps = AppButtonProps & {
  label?: string;
  showIcon?: boolean;
  /** Outlined secondary styling for tab empty states. */
  emptyState?: boolean;
};

/** Tab create action. Outlined so it stays visible on a white page. */
export function TabAddActionButton({
  label = "Add",
  showIcon = true,
  emptyState: _emptyState = false,
  className,
  children,
  ...props
}: AddActionButtonProps) {
  return (
    <SecondaryButton
      size="sm"
      className={cn("h-8 gap-1.5 px-3", className)}
      {...props}
    >
      {showIcon ? <AppIcon name="add" size={14} /> : null}
      {children ?? label}
    </SecondaryButton>
  );
}

/** Page-level create action — square primary, not the dialog pill. */
export function PageActionButton({ className, ...props }: AppButtonProps) {
  return (
    <Button
      variant="primary"
      className={cn("h-8 gap-1.5 px-3 text-[13px] active:scale-[0.98]", className)}
      {...props}
    />
  );
}

export function AddActionButton({
  label = "Add",
  showIcon = true,
  className,
  children,
  ...props
}: AddActionButtonProps) {
  return (
    <PrimaryButton className={className} {...props}>
      {showIcon ? <AppIcon name="add" size={16} /> : null}
      {children ?? label}
    </PrimaryButton>
  );
}

export { buttonVariants };
