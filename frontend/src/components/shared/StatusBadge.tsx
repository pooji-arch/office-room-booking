import { cn } from "@/lib/utils"

export type BadgeTone =
  | "success"
  | "warning"
  | "destructive"
  | "neutral"
  | "info"
  | "purple"
  | "chart-1"
  | "chart-2"
  | "chart-3"
  | "chart-4"
  | "chart-5"
  | "chart-6"
  | "chart-7"
  | "chart-8"

// The chart-* tones are the categorical palette used to color-code an
// open-ended set of real-world values (departments) consistently across
// pages — same department, same color, wherever it's shown as a badge.
export const CHART_TONES: BadgeTone[] = [
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "chart-6",
  "chart-7",
  "chart-8",
]

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/15 text-warning-foreground border-warning/30",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  purple: "bg-primary/10 text-primary border-primary/20",
  "chart-1": "bg-chart-1/10 text-chart-1 border-chart-1/20",
  "chart-2": "bg-chart-2/10 text-chart-2 border-chart-2/20",
  "chart-3": "bg-chart-3/10 text-chart-3 border-chart-3/20",
  "chart-4": "bg-chart-4/10 text-chart-4 border-chart-4/20",
  "chart-5": "bg-chart-5/10 text-chart-5 border-chart-5/20",
  "chart-6": "bg-chart-6/10 text-chart-6 border-chart-6/20",
  "chart-7": "bg-chart-7/10 text-chart-7 border-chart-7/20",
  "chart-8": "bg-chart-8/10 text-chart-8 border-chart-8/20",
}

const DOT_CLASSES: Record<BadgeTone, string> = {
  success: "bg-success shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-success/60",
  warning: "bg-warning shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-warning/60",
  destructive: "bg-destructive shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-destructive/60",
  neutral: "bg-muted-foreground",
  info: "bg-chart-4 shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-chart-4/60",
  purple: "bg-primary shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-primary/60",
  "chart-1": "bg-chart-1 shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-chart-1/60",
  "chart-2": "bg-chart-2 shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-chart-2/60",
  "chart-3": "bg-chart-3 shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-chart-3/60",
  "chart-4": "bg-chart-4 shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-chart-4/60",
  "chart-5": "bg-chart-5 shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-chart-5/60",
  "chart-6": "bg-chart-6 shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-chart-6/60",
  "chart-7": "bg-chart-7 shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-chart-7/60",
  "chart-8": "bg-chart-8 shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-chart-8/60",
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
  PENDING_APPROVAL: "chart-6",
  ACCEPTED: "success",
  DECLINED: "destructive",
  TENTATIVE: "info",
  CHAIR: "purple",
  PARTICIPANT: "neutral",
  TACTICAL: "chart-2",
  STRATEGY: "chart-5",
  INTERNAL: "neutral",
  OTHER: "info",
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
  PENDING_APPROVAL: "Pending Approval",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  TENTATIVE: "Tentative",
  CHAIR: "Chair",
  PARTICIPANT: "Participant",
  TACTICAL: "Tactical",
  STRATEGY: "Strategy",
  INTERNAL: "Internal",
  OTHER: "Others",
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
  showDot?: boolean
}

export function StatusBadge({ status, label, tone, className, showDot = true }: StatusBadgeProps) {
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
      {showDot && <span className={cn("size-1.5 rounded-full shrink-0", DOT_CLASSES[resolvedTone])} />}
      {resolvedLabel}
    </span>
  )
}
