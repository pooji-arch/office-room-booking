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

const DOT_CLASSES: Record<BadgeTone, string> = {
  success: "bg-success shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-success/60",
  warning: "bg-warning shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-warning/60",
  destructive: "bg-destructive shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-destructive/60",
  neutral: "bg-muted-foreground",
  info: "bg-chart-4 shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-chart-4/60",
  purple: "bg-primary shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-primary/60",
}

const STATUS_TONE: Record<string, BadgeTone> = {
  AVAILABLE: "success",
  ACTIVE: "success",
  CONFIRMED: "success",
  MAINTENANCE: "warning",
  RESCHEDULED: "warning",
  UNAVAILABLE: "destructive",
  INACTIVE: "warning",
  CANCELLED: "destructive",
  COMPLETED: "purple",
  ADMIN: "info",
  USER: "neutral",
  PENDING: "warning",
  ACCEPTED: "success",
  DECLINED: "destructive",
  TENTATIVE: "info",
  CHAIR: "purple",
  PARTICIPANT: "neutral",
  INTERNAL: "neutral",
  CLIENT: "info",
  REVIEW: "warning",
  OTHER: "neutral",
  DRAFT: "warning",
  FINAL: "success",
  OPEN: "warning",
  IN_PROGRESS: "info",
  DONE: "success",
  DELAYED: "destructive",
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
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
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  TENTATIVE: "Tentative",
  CHAIR: "Chair",
  PARTICIPANT: "Participant",
  INTERNAL: "Internal",
  CLIENT: "Client",
  REVIEW: "Review",
  OTHER: "Other",
  DRAFT: "Draft",
  FINAL: "Final",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
  DELAYED: "Delayed",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium shadow-sm",
        TONE_CLASSES[resolvedTone],
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOT_CLASSES[resolvedTone])} />
      {resolvedLabel}
    </span>
  )
}
