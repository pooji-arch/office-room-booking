import { CalendarCheck2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function Logo({ className, iconOnly }: { className?: string; iconOnly?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <CalendarCheck2 className="size-4.5" />
      </div>
      {!iconOnly && <span className="text-lg font-semibold tracking-tight">RoomBook</span>}
    </div>
  )
}
