import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonShadow =
  "shadow-[0_1px_2px_rgba(16,24,40,0.05),inset_0_-1px_0_rgba(16,24,40,0.05)]";

const buttonVariants = cva(
  "group relative inline-flex cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-lg text-sm font-semibold transition duration-100 ease-linear before:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: [
          buttonShadow,
          "bg-brand-primary text-white ring-1 ring-inset ring-transparent hover:bg-brand-primary-hover",
          "before:absolute before:inset-px before:rounded-[7px] before:border before:border-white/12 before:mask-b-from-0%",
        ].join(" "),
        primary: [
          buttonShadow,
          "bg-brand-primary text-white ring-1 ring-inset ring-transparent hover:bg-brand-primary-hover",
          "before:absolute before:inset-px before:rounded-[7px] before:border before:border-white/12 before:mask-b-from-0%",
        ].join(" "),
        destructive: [
          buttonShadow,
          "bg-destructive text-white ring-1 ring-inset ring-transparent outline-destructive hover:bg-destructive/90",
          "before:absolute before:inset-px before:rounded-[7px] before:border before:border-white/12 before:mask-b-from-0%",
        ].join(" "),
        outline: [
          buttonShadow,
          "bg-white text-brand-navy ring-1 ring-inset ring-dash-border hover:bg-dash-canvas",
        ].join(" "),
        secondary: [
          buttonShadow,
          "bg-white text-brand-navy ring-1 ring-inset ring-dash-border hover:bg-dash-canvas",
        ].join(" "),
        ghost:
          "text-brand-slate hover:bg-dash-canvas hover:text-brand-navy",
        link: "h-auto rounded-none px-0 text-brand-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 gap-1 rounded-lg px-3.5 before:rounded-[7px]",
        sm: "h-8 gap-1 rounded-lg px-3 text-sm before:rounded-[7px]",
        lg: "h-11 gap-1.5 rounded-lg px-4 before:rounded-[7px]",
        icon: "size-10 rounded-lg p-2.5 before:rounded-[7px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
