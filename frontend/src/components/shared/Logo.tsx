import { cn } from "@/lib/utils"

export function Logo({ className, iconOnly, full }: { className?: string; iconOnly?: boolean; full?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img src="/logo.png" alt="MMS" className="size-8 shrink-0 object-contain" />
      {!iconOnly && (
        <span className="text-lg font-semibold tracking-tight">
          {full ? "Meeting Management System" : "MMS"}
        </span>
      )}
    </div>
  )
}
