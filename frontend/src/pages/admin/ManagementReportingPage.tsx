import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { AlertTriangle, Building2, CalendarRange, CheckCircle2, History, Pencil, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { CardContentSkeleton } from "@/components/shared/PageSkeletons"
import {
  useActionItemStatusHistory,
  useAllActionItems,
  useMeetings,
  useMinutesRevisions,
} from "@/hooks/useMeetings"
import { formatDateShort, formatRelativeTime, initials } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ActionItemStatus, ActionItemWithMeeting } from "@/types"

type AuditEntry =
  | { kind: "status_change"; id: string; meetingId: string; changedAt: string; text: string }
  | { kind: "minutes_edit"; id: string; meetingId: string; changedAt: string; text: string; reason: string }

const STATUS_LABEL: Record<ActionItemStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  DELAYED: "Delayed",
  DONE: "Done",
}

const PROGRESS_BY_STATUS: Record<ActionItemStatus, number> = {
  OPEN: 15,
  IN_PROGRESS: 55,
  DELAYED: 80,
  DONE: 100,
}

function barColorClass(status: ActionItemStatus) {
  if (status === "DELAYED") return "bg-destructive"
  if (status === "DONE") return "bg-success"
  return "bg-primary"
}

function pctToneClass(pct: number) {
  if (pct >= 70) return "text-success"
  if (pct >= 40) return "text-warning-foreground"
  return "text-destructive"
}

function departmentBreakdown(items: ActionItemWithMeeting[]) {
  const byDept = new Map<string, ActionItemWithMeeting[]>()
  for (const item of items) {
    const dept = item.meetingDepartment ?? "General"
    if (!byDept.has(dept)) byDept.set(dept, [])
    byDept.get(dept)!.push(item)
  }
  return [...byDept.entries()]
    .map(([dept, deptItems]) => ({
      dept,
      count: deptItems.length,
      pct: Math.round((deptItems.filter((i) => i.status === "DONE").length / deptItems.length) * 100),
    }))
    .sort((a, b) => b.pct - a.pct)
}

const KPI_CARDS = [
  { key: "tracked", label: "Meetings tracked", icon: CalendarRange, tone: "bg-primary/10 text-primary" },
  { key: "held", label: "Meetings held", icon: CheckCircle2, tone: "bg-success/10 text-success" },
  { key: "closure", label: "Action item closure rate", icon: TrendingUp, tone: "bg-chart-4/10 text-chart-4" },
  { key: "delayed", label: "Delayed items", icon: AlertTriangle, tone: "bg-warning/15 text-warning-foreground" },
] as const

export function ManagementReportingPage() {
  const navigate = useNavigate()
  const { data: allMeetings, isLoading: isLoadingMeetings } = useMeetings({ pageSize: 1 })
  const { data: completedMeetings, isLoading: isLoadingCompleted } = useMeetings({
    bucket: "completed",
    pageSize: 1,
  })
  const { data: actionItems, isLoading: isLoadingItems } = useAllActionItems()
  const { data: statusHistory, isLoading: isLoadingStatusHistory } = useActionItemStatusHistory({ limit: 20 })
  const { data: minutesRevisions, isLoading: isLoadingRevisions } = useMinutesRevisions({ limit: 20 })

  const isLoading = isLoadingMeetings || isLoadingCompleted || isLoadingItems
  const isLoadingAudit = isLoadingStatusHistory || isLoadingRevisions

  const auditEntries: AuditEntry[] = useMemo(() => {
    const fromStatus: AuditEntry[] = (statusHistory ?? []).map((h) => ({
      kind: "status_change",
      id: h.id,
      meetingId: h.meetingId,
      changedAt: h.changedAt,
      text: `${h.changedByName ?? "Someone"} moved "${h.actionItemTitle}" from ${STATUS_LABEL[h.previousStatus]} to ${STATUS_LABEL[h.newStatus]} on "${h.meetingTitle}"`,
    }))
    const fromRevisions: AuditEntry[] = (minutesRevisions ?? []).map((r) => ({
      kind: "minutes_edit",
      id: r.id,
      meetingId: r.meetingId,
      changedAt: r.changedAt,
      text: `${r.authorName ?? "Someone"} edited finalized minutes for "${r.meetingTitle}"`,
      reason: r.reason,
    }))
    return [...fromStatus, ...fromRevisions]
      .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
      .slice(0, 15)
  }, [statusHistory, minutesRevisions])

  const totalMeetings = allMeetings?.pagination.total ?? 0
  const heldMeetings = completedMeetings?.pagination.total ?? 0
  const items = useMemo(() => actionItems ?? [], [actionItems])
  const closureRate = items.length
    ? Math.round((items.filter((i) => i.status === "DONE").length / items.length) * 100)
    : 0
  const delayedCount = items.filter((i) => i.status === "DELAYED").length
  const byDepartment = useMemo(() => departmentBreakdown(items), [items])

  const kpiValues: Record<(typeof KPI_CARDS)[number]["key"], string> = {
    tracked: String(totalMeetings),
    held: String(heldMeetings),
    closure: `${closureRate}%`,
    delayed: String(delayedCount),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Management Reporting</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A live rollup of meeting activity and action item health across the organization.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-5">
                <CardContentSkeleton lines={2} />
              </div>
            ))}
          </div>
          <div className="rounded-xl border bg-card p-5">
            <CardContentSkeleton lines={4} />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {KPI_CARDS.map(({ key, label, icon: Icon, tone }) => (
              <Card
                key={key}
                className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"
              >
                <CardContent className="space-y-3 pt-5">
                  <div className={cn("flex size-9 items-center justify-center rounded-lg", tone)}>
                    <Icon className="size-4.5" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold tabular-nums">{kpiValues[key]}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="size-4 text-muted-foreground" />
                Action items by department
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {byDepartment.length === 0 ? (
                <p className="text-sm text-muted-foreground">No action items yet.</p>
              ) : (
                byDepartment.map(({ dept, pct, count }) => (
                  <div
                    key={dept}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="w-28 shrink-0 truncate font-medium">{dept}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={cn("w-12 shrink-0 text-right font-semibold tabular-nums", pctToneClass(pct))}>
                      {pct}%
                    </span>
                    <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                      {count} item{count === 1 ? "" : "s"}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarRange className="size-4 text-muted-foreground" />
                Timeline — action items vs. due date
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[28rem] space-y-1 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No action items yet.</p>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(`/admin/meetings/${item.meetingId}`)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                  >
                    <Avatar className="size-6 shrink-0">
                      <AvatarFallback className="bg-accent text-[10px] text-accent-foreground">
                        {item.ownerName ? initials(item.ownerName) : "—"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="w-40 shrink-0 truncate font-medium">{item.title}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", barColorClass(item.status))}
                        style={{ width: `${PROGRESS_BY_STATUS[item.status]}%` }}
                      />
                    </div>
                    <StatusBadge status={item.status} className="shrink-0" />
                    <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                      {item.dueDate ? formatDateShort(item.dueDate) : "No due date"}
                    </span>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="size-4 text-muted-foreground" />
                Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[24rem] space-y-1 overflow-y-auto">
              {isLoadingAudit ? (
                <CardContentSkeleton lines={3} />
              ) : auditEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No action item status changes or minutes edits yet.</p>
              ) : (
                auditEntries.map((entry) => (
                  <button
                    key={`${entry.kind}-${entry.id}`}
                    type="button"
                    onClick={() => navigate(`/admin/meetings/${entry.meetingId}`)}
                    className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                  >
                    {entry.kind === "minutes_edit" ? (
                      <Pencil className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <History className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{entry.text}</p>
                      {entry.kind === "minutes_edit" && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">Reason: {entry.reason}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
                      {formatRelativeTime(entry.changedAt)}
                    </span>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
