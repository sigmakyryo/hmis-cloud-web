import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.05)] ring-1 ring-inset ring-dash-border transition-shadow duration-100 ease-linear file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-dash-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-destructive/40 aria-invalid:focus-visible:ring-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
