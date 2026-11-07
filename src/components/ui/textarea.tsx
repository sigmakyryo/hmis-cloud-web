import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.05)] ring-1 ring-inset ring-dash-border transition-shadow duration-100 ease-linear outline-none placeholder:text-dash-muted focus-visible:ring-2 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-destructive/40 aria-invalid:focus-visible:ring-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
