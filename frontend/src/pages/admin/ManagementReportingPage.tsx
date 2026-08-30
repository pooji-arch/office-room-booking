import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  History,
  Pencil,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Sparkline } from "@/components/shared/Sparkline"
import { CardContentSkeleton } from "@/components/shared/PageSkeletons"
import {
  useActionItemStatusHistory,
  useAllActionItems,
  useMeetings,
  useMinutesRevisions,
} from "@/hooks/useMeetings"
import { meetingDisplayStatus } from "@/lib/meeting-buckets"
import { formatDateShort, formatRelativeTime, initials } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ActionItemStatus, ActionItemWithMeeting, Meeting } from "@/types"

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

// ---- date-range math -------------------------------------------------
// One range control drives every range-scoped section below (the 4 stat
// cards and the department donut/health buckets) — the due-soon table,
// timeline, and audit trail stay unscoped since they're inherently
// "what's true right now" views, not activity-in-a-period views.

type RangePreset = "week" | "last7" | "month" | "all"

const RANGE_LABELS: Record<RangePreset, string> = {
  week: "This Week",
  last7: "Last 7 Days",
  month: "This Month",
  all: "All Time",
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}
function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
function startOfWeek(d: Date) {
  const day = d.getDay()
  return addDays(d, day === 0 ? -6 : 1 - day)
}

function getRange(preset: RangePreset): { from: string; to: string; label: string } {
  const today = new Date()
  if (preset === "last7") {
    const from = addDays(today, -6)
    return { from: isoDate(from), to: isoDate(today), label: `${formatDateShort(isoDate(from))} – ${formatDateShort(isoDate(today))}` }
  }
  if (preset === "month") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1)
    return { from: isoDate(from), to: isoDate(today), label: `${formatDateShort(isoDate(from))} – ${formatDateShort(isoDate(today))}` }
  }
  if (preset === "all") {
    return { from: "2000-01-01", to: "2100-01-01", label: "All time" }
  }
  const from = startOfWeek(today)
  const to = addDays(from, 6)
  return { from: isoDate(from), to: isoDate(to), label: `${formatDateShort(isoDate(from))} – ${formatDateShort(isoDate(to))}` }
}

function getPreviousRange(from: string, to: string) {
  const fromD = new Date(from)
  const toD = new Date(to)
  const lengthDays = Math.round((toD.getTime() - fromD.getTime()) / 86400000) + 1
  const prevTo = addDays(fromD, -1)
  const prevFrom = addDays(prevTo, -(lengthDays - 1))
  return { from: isoDate(prevFrom), to: isoDate(prevTo) }
}

function pct(count: number, total: number) {
  return total === 0 ? 0 : Math.round((count / total) * 100)
}

// Delta color follows direction × whether up is good for THIS metric — more
// meetings tracked is good, more delayed items is not.
function trendDelta(current: number, previous: number, upIsGood: boolean, unit: "count" | "points" = "count") {
  if (current === previous) return { text: "No change vs last period", tone: "neutral" as const }
  if (previous === 0) return { text: "New activity vs last period", tone: upIsGood ? ("success" as const) : ("warning" as const) }
  const isUp = current > previous
  const good = isUp === upIsGood
  const magnitude = unit === "points" ? `${Math.abs(current - previous)}pp` : `${Math.abs(Math.round(((current - previous) / previous) * 100))}%`
  return { text: `${isUp ? "↑" : "↓"} ${magnitude} vs last period`, tone: good ? ("success" as const) : ("destructive" as const) }
}

const TREND_TONE_CLASS = {
  success: "text-success",
  destructive: "text-destructive",
  warning: "text-warning",
  neutral: "text-muted-foreground",
} as const

function exportReportCsv(items: ActionItemWithMeeting[]) {
  const header = ["Title", "Meeting", "Department", "Owner", "Due Date", "Priority", "Status"]
  const rows = items.map((i) => [
    i.title,
    i.meetingTitle,
    i.meetingDepartment ?? "",
    i.ownerName ?? "",
    i.dueDate ?? "",
    i.priority,
    STATUS_LABEL[i.status],
  ])
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `management-report-${isoDate(new Date())}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function dailyCounts(dates: string[], last7: string[]) {
  return last7.map((day) => dates.filter((d) => d === day).length)
}

export function ManagementReportingPage() {
  const navigate = useNavigate()
  const [rangePreset, setRangePreset] = useState<RangePreset>("week")

  const { data: meetingsPage, isLoading: isLoadingMeetings } = useMeetings({ pageSize: 500 })
  const { data: actionItems, isLoading: isLoadingItems } = useAllActionItems()
  const { data: statusHistory, isLoading: isLoadingStatusHistory } = useActionItemStatusHistory({ limit: 20 })
  const { data: minutesRevisions, isLoading: isLoadingRevisions } = useMinutesRevisions({ limit: 20 })

  const isLoading = isLoadingMeetings || isLoadingItems
  const isLoadingAudit = isLoadingStatusHistory || isLoadingRevisions

  const meetings = useMemo<Meeting[]>(() => meetingsPage?.data ?? [], [meetingsPage])
  const items = useMemo(() => actionItems ?? [], [actionItems])

  const range = useMemo(() => getRange(rangePreset), [rangePreset])
  const prevRange = useMemo(() => getPreviousRange(range.from, range.to), [range])
  const hasComparison = rangePreset !== "all"

  const meetingsInRange = useMemo(
    () => meetings.filter((m) => m.date >= range.from && m.date <= range.to),
    [meetings, range]
  )
  const meetingsInPrevRange = useMemo(
    () => meetings.filter((m) => m.date >= prevRange.from && m.date <= prevRange.to),
    [meetings, prevRange]
  )
  const itemsInRange = useMemo(
    () => items.filter((i) => i.createdAt.slice(0, 10) >= range.from && i.createdAt.slice(0, 10) <= range.to),
    [items, range]
  )
  const itemsInPrevRange = useMemo(
    () => items.filter((i) => i.createdAt.slice(0, 10) >= prevRange.from && i.createdAt.slice(0, 10) <= prevRange.to),
    [items, prevRange]
  )

  const trackedCount = meetingsInRange.length
  const heldCount = meetingsInRange.filter((m) => meetingDisplayStatus(m) === "COMPLETED").length
  const heldPrevCount = meetingsInPrevRange.filter((m) => meetingDisplayStatus(m) === "COMPLETED").length
  const closureRate = pct(itemsInRange.filter((i) => i.status === "DONE").length, itemsInRange.length)
  const closureRatePrev = pct(itemsInPrevRange.filter((i) => i.status === "DONE").length, itemsInPrevRange.length)
  const delayedCount = itemsInRange.filter((i) => i.status === "DELAYED").length
  const delayedPrevCount = itemsInPrevRange.filter((i) => i.status === "DELAYED").length

  const last7Days = useMemo(() => Array.from({ length: 7 }, (_, i) => isoDate(addDays(new Date(), -(6 - i)))), [])
  const trackedSparkline = useMemo(() => dailyCounts(meetings.map((m) => m.date), last7Days), [meetings, last7Days])
  const heldSparkline = useMemo(
    () =>
      last7Days.map((day) => meetings.filter((m) => m.date === day && meetingDisplayStatus(m) === "COMPLETED").length),
    [meetings, last7Days]
  )
  const closureSparkline = useMemo(
    () =>
      last7Days.map((day) => {
        const dayItems = items.filter((i) => i.createdAt.slice(0, 10) === day)
        return pct(dayItems.filter((i) => i.status === "DONE").length, dayItems.length)
      }),
    [items, last7Days]
  )
  const delayedSparkline = useMemo(
    () => dailyCounts(items.filter((i) => i.status === "DELAYED").map((i) => i.createdAt.slice(0, 10)), last7Days),
    [items, last7Days]
  )

  const KPI_CARDS = [
    {
      key: "tracked",
      label: "Meetings tracked",
      icon: CalendarRange,
      tone: "bg-primary/10 text-primary",
      value: String(trackedCount),
      delta: hasComparison ? trendDelta(trackedCount, meetingsInPrevRange.length, true) : null,
      sparkline: trackedSparkline,
    },
    {
      key: "held",
      label: "Meetings held",
      icon: CheckCircle2,
      tone: "bg-success/10 text-success",
      value: String(heldCount),
      delta: hasComparison ? trendDelta(heldCount, heldPrevCount, true) : null,
      sparkline: heldSparkline,
    },
    {
      key: "closure",
      label: "Action item closure rate",
      icon: TrendingUp,
      tone: "bg-chart-4/10 text-chart-4",
      value: `${closureRate}%`,
      delta: hasComparison ? trendDelta(closureRate, closureRatePrev, true, "points") : null,
      sparkline: closureSparkline,
    },
    {
      key: "delayed",
      label: "Delayed items",
      icon: AlertTriangle,
      tone: "bg-warning/10 text-warning",
      value: String(delayedCount),
      delta: hasComparison ? trendDelta(delayedCount, delayedPrevCount, false) : null,
      sparkline: delayedSparkline,
    },
  ] as const

  const dueSoon = useMemo(() => {
    const todayStr = isoDate(new Date())
    const horizon = isoDate(addDays(new Date(), 14))
    return items
      .filter((i) => i.status !== "DONE" && i.dueDate && i.dueDate >= todayStr && i.dueDate <= horizon)
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
  }, [items])

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Management Reporting</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A live rollup of meeting activity and action item health across the organization.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarRange className="size-4" />
                {range.label}
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(RANGE_LABELS) as RangePreset[]).map((preset) => (
                <DropdownMenuItem key={preset} onClick={() => setRangePreset(preset)}>
                  {RANGE_LABELS[preset]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" onClick={() => exportReportCsv(items)} disabled={items.length === 0}>
            <Download className="size-4" />
            Export Report
          </Button>
        </div>
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
            {KPI_CARDS.map(({ key, label, icon: Icon, tone, value, delta, sparkline }) => (
              <Card
                key={key}
                className="overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"
              >
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className={cn("flex size-9 items-center justify-center rounded-lg", tone)}>
                      <Icon className="size-4.5" />
                    </div>
                    <Sparkline values={sparkline} className="h-7 w-16 shrink-0" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{value}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{label}</p>
                    {delta && (
                      <p className={cn("mt-1.5 text-xs font-medium", TREND_TONE_CLASS[delta.tone])}>{delta.text}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="size-4 text-muted-foreground" />
                Action items approaching due
                <span className="font-normal text-muted-foreground">— next 14 days</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[22rem] overflow-y-auto p-0">
              {dueSoon.length === 0 ? (
                <p className="px-6 py-4 text-sm text-muted-foreground">Nothing due in the next 14 days.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-6 py-2 font-medium">Action Item</th>
                      <th className="px-3 py-2 font-medium">Meeting</th>
                      <th className="px-3 py-2 font-medium">Owner</th>
                      <th className="px-3 py-2 font-medium">Due Date</th>
                      <th className="px-3 py-2 font-medium">Priority</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dueSoon.map((item) => (
                      <tr
                        key={item.id}
                        className="cursor-pointer border-t transition-colors hover:bg-muted/50"
                        onClick={() => navigate(`/admin/meetings/${item.meetingId}`)}
                      >
                        <td className="max-w-56 truncate px-6 py-2.5 font-medium">{item.title}</td>
                        <td className="max-w-40 truncate px-3 py-2.5 text-muted-foreground">{item.meetingTitle}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-6 shrink-0">
                              <AvatarFallback className="bg-accent text-[10px] text-accent-foreground">
                                {item.ownerName ? initials(item.ownerName) : "—"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate text-muted-foreground">{item.ownerName ?? "Unassigned"}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                          {formatDateShort(item.dueDate!)}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={item.priority} />
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={item.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
