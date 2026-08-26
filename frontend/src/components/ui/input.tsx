import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-transparent bg-background px-2.5 py-1 text-base shadow-[inset_0_1px_2px_0_rgba(0,0,0,0.045)] transition-colors outline-none [background-clip:padding-box,border-box] [background-image:linear-gradient(var(--background),var(--background)),linear-gradient(135deg,color-mix(in_oklch,var(--primary),transparent_55%),color-mix(in_oklch,var(--primary),black_18%))] [background-origin:border-box] file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:shadow-[inset_0_1px_2px_0_rgba(0,0,0,0.3)] dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
