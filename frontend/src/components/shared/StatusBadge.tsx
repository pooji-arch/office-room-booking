import { cn } from "@/lib/utils"

export type BadgeTone = "success" | "warning" | "destructive" | "neutral" | "info" | "purple"

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/15 text-warning-foreground border-warning/30",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  purple: "bg-primary/10 text-primary border-primary/20",
}

const STATUS_TONE: Record<string, BadgeTone> = {
  AVAILABLE: "success",
  ACTIVE: "success",
  CONFIRMED: "success",
  MAINTENANCE: "warning",
  RESCHEDULED: "warning",
  UNAVAILABLE: "destructive",
  INACTIVE: "neutral",
  CANCELLED: "neutral",
  COMPLETED: "purple",
  ADMIN: "info",
  USER: "neutral",
}

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Available",
  ACTIVE: "Active",
  CONFIRMED: "Confirmed",
  MAINTENANCE: "Maintenance",
  RESCHEDULED: "Rescheduled",
  UNAVAILABLE: "Unavailable",
  INACTIVE: "Inactive",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  ADMIN: "Admin",
  USER: "User",
}

interface StatusBadgeProps {
  status: string
  label?: string
  tone?: BadgeTone
  className?: string
}

export function StatusBadge({ status, label, tone, className }: StatusBadgeProps) {
  const resolvedTone = tone ?? STATUS_TONE[status] ?? "neutral"
  const resolvedLabel = label ?? STATUS_LABEL[status] ?? status

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[resolvedTone],
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {resolvedLabel}
    </span>
  )
}
