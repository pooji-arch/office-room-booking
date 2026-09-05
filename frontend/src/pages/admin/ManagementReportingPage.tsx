import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertTriangle,
  Building2,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  History,
  Pencil,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { CardContentSkeleton } from "@/components/shared/PageSkeletons"
import {
  useActionItemStatusHistory,
  useAllActionItems,
  useMeetings,
  useMinutesRevisions,
} from "@/hooks/useMeetings"
import { meetingDisplayStatus } from "@/lib/meeting-buckets"
import { formatDateShort, formatRelativeTime, initials, parseDateInputValue } from "@/lib/format"
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

// The department chart is stacked by meeting status, not colored per
// department — active-to-terminal ordering, one fixed color per status
// (chart-6 for Pending Approval since it has no other solid-fill precedent
// elsewhere; the other four reuse this app's own established status colors).
const STATUS_SEGMENT_ORDER = ["CONFIRMED", "COMPLETED", "RESCHEDULED", "PENDING_APPROVAL", "CANCELLED"] as const
type StatusSegment = (typeof STATUS_SEGMENT_ORDER)[number]
const STATUS_SEGMENT_LABEL: Record<StatusSegment, string> = {
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  RESCHEDULED: "Rescheduled",
  PENDING_APPROVAL: "Pending Approval",
  CANCELLED: "Cancelled",
}
const STATUS_SEGMENT_BAR_CLASS: Record<StatusSegment, string> = {
  CONFIRMED: "bg-success",
  COMPLETED: "bg-primary",
  RESCHEDULED: "bg-warning",
  PENDING_APPROVAL: "bg-chart-6",
  CANCELLED: "bg-destructive",
}

// Rounds a bar chart's max value up to a "nice" axis ceiling (5, 10, 20, 50,
// 100, ...) rather than the exact data max, so the axis reads like a real
// chart's gridlines instead of stopping at an arbitrary number.
function niceAxisMax(value: number): number {
  if (value <= 5) return 5
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
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

// This app's date columns are naive wall-clock India time (see migration
// 0014's AT TIME ZONE 'Asia/Kolkata' fix) — "today" has to be computed in
// that zone explicitly, not whatever zone toISOString()'s UTC conversion (or
// the viewer's own machine) happens to be in, or this range math silently
// shifts by a day for part of every 24 hours.
function todayInKolkata(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  // Only ever read back via plain local getters (isoDate/addDays/etc. below)
  // — never re-converted through another timezone — so it stays internally
  // consistent regardless of what timezone the runtime itself is in.
  return new Date(get("year"), get("month") - 1, get("day"))
}
function isoDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${dd}`
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
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

function getRange(preset: RangePreset): { from: string; to: string; label: string } {
  const today = todayInKolkata()
  if (preset === "last7") {
    const from = addDays(today, -6)
    return { from: isoDate(from), to: isoDate(today), label: `${formatDateShort(isoDate(from))} – ${formatDateShort(isoDate(today))}` }
  }
  if (preset === "month") {
    // Full calendar month, same "whole period, not just to-date" semantics
    // as "This Week" below — was previously month-to-date only, which read
    // inconsistently next to a week range that already includes its own
    // not-yet-happened days.
    const from = new Date(today.getFullYear(), today.getMonth(), 1)
    const to = endOfMonth(today)
    return { from: isoDate(from), to: isoDate(to), label: `${formatDateShort(isoDate(from))} – ${formatDateShort(isoDate(to))}` }
  }
  if (preset === "all") {
    return { from: "2000-01-01", to: "2100-01-01", label: "All time" }
  }
  const from = startOfWeek(today)
  const to = addDays(from, 6)
  return { from: isoDate(from), to: isoDate(to), label: `${formatDateShort(isoDate(from))} – ${formatDateShort(isoDate(to))}` }
}

function getPreviousRange(preset: RangePreset, from: string, to: string) {
  const fromD = parseDateInputValue(from)
  if (preset === "month") {
    // A fixed-day-count lookback doesn't work for calendar months (28-31
    // days) — "vs last period" for "This Month" means the actual previous
    // calendar month, not some arbitrary same-length trailing window.
    const prevMonthFrom = new Date(fromD.getFullYear(), fromD.getMonth() - 1, 1)
    return { from: isoDate(prevMonthFrom), to: isoDate(endOfMonth(prevMonthFrom)) }
  }
  const toD = parseDateInputValue(to)
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
  success: "bg-success/10 text-success",
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning/15 text-warning-foreground",
  neutral: "bg-muted text-muted-foreground",
} as const

// Each KPI gets its own hue end-to-end (wash + icon badge + border) rather
// than one neutral card style repeated four times — the whole point of the
// redesign was "colorful," not just "smaller."
const ACCENT_STYLES = {
  primary: {
    card: "border-primary/20 bg-gradient-to-br from-primary/12 via-card to-card",
    icon: "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/30",
  },
  success: {
    card: "border-success/20 bg-gradient-to-br from-success/12 via-card to-card",
    icon: "bg-gradient-to-br from-success to-success/70 text-success-foreground shadow-lg shadow-success/30",
  },
  info: {
    card: "border-chart-4/20 bg-gradient-to-br from-chart-4/12 via-card to-card",
    icon: "bg-gradient-to-br from-chart-4 to-chart-4/70 text-white shadow-lg shadow-chart-4/30",
  },
  warning: {
    card: "border-warning/25 bg-gradient-to-br from-warning/15 via-card to-card",
    icon: "bg-gradient-to-br from-warning to-warning/70 text-warning-foreground shadow-lg shadow-warning/30",
  },
} as const satisfies Record<string, { card: string; icon: string }>

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
  const prevRange = useMemo(() => getPreviousRange(rangePreset, range.from, range.to), [rangePreset, range])
  const hasComparison = rangePreset !== "all"

  const meetingsInRange = useMemo(
    () => meetings.filter((m) => m.date >= range.from && m.date <= range.to),
    [meetings, range]
  )
  const meetingsInPrevRange = useMemo(
    () => meetings.filter((m) => m.date >= prevRange.from && m.date <= prevRange.to),
    [meetings, prevRange]
  )

  const trackedCount = meetingsInRange.length
  const heldCount = meetingsInRange.filter((m) => meetingDisplayStatus(m) === "COMPLETED").length
  const heldPrevCount = meetingsInPrevRange.filter((m) => meetingDisplayStatus(m) === "COMPLETED").length
  // Closure rate and delayed count are current-state snapshots (is this item
  // DELAYED/DONE right now), not scoped to the selected date range at all —
  // scoping them by createdAt previously meant an item created in August
  // that's delayed today simply wouldn't count while viewing "This Week" in
  // September, even though it's genuinely delayed right now. No date range
  // has a meaningful "previous period" for a snapshot metric, so these two
  // don't get a comparison delta the way the two meeting-based cards do.
  const closureRate = pct(items.filter((i) => i.status === "DONE").length, items.length)
  const delayedCount = items.filter((i) => i.status === "DELAYED").length

  // Department is free text, so "Development"/"development" must be merged
  // case-insensitively (same reasoning as the Departments page) rather than
  // treated as two bars for what's really one department. Each department's
  // meetings are further broken down by display status, for the stacked bar.
  const departmentStatusCounts = useMemo(() => {
    const byKey = new Map<string, { label: string; counts: Partial<Record<StatusSegment, number>>; total: number }>()
    for (const m of meetingsInRange) {
      const label = m.department?.trim() || "Unspecified"
      const key = label.toLowerCase()
      const status = meetingDisplayStatus(m) as StatusSegment
      const entry = byKey.get(key) ?? { label, counts: {}, total: 0 }
      entry.counts[status] = (entry.counts[status] ?? 0) + 1
      entry.total++
      byKey.set(key, entry)
    }
    return [...byKey.values()].sort((a, b) => b.total - a.total)
  }, [meetingsInRange])
  const maxDepartmentTotal = Math.max(1, ...departmentStatusCounts.map((d) => d.total))
  const axisMax = niceAxisMax(maxDepartmentTotal)
  const axisTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(axisMax * f))

  const KPI_CARDS = [
    {
      key: "tracked",
      label: "Meetings tracked",
      icon: CalendarRange,
      accent: "primary",
      value: String(trackedCount),
      delta: hasComparison ? trendDelta(trackedCount, meetingsInPrevRange.length, true) : null,
    },
    {
      key: "held",
      label: "Meetings held",
      icon: CheckCircle2,
      accent: "success",
      value: String(heldCount),
      delta: hasComparison ? trendDelta(heldCount, heldPrevCount, true) : null,
    },
    {
      key: "closure",
      label: "Action item closure rate",
      icon: TrendingUp,
      accent: "info",
      value: `${closureRate}%`,
      delta: null,
    },
    {
      key: "delayed",
      label: "Delayed items",
      icon: AlertTriangle,
      accent: "warning",
      value: String(delayedCount),
      delta: null,
    },
  ] as const

  const dueSoon = useMemo(() => {
    const todayStr = isoDate(todayInKolkata())
    const horizon = isoDate(addDays(todayInKolkata(), 14))
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
          <h1 className="text-2xl font-extrabold tracking-tight">Management Reporting</h1>
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {KPI_CARDS.map(({ key, label, icon: Icon, accent, value, delta }) => (
              <Card
                key={key}
                className={cn(
                  "overflow-hidden border py-0 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
                  ACCENT_STYLES[accent].card
                )}
              >
                <CardContent className="space-y-2 p-3.5">
                  <div className={cn("flex size-8 items-center justify-center rounded-lg", ACCENT_STYLES[accent].icon)}>
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tracking-tight">{value}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{label}</p>
                  </div>
                  {delta && (
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-[11px] font-medium",
                        TREND_TONE_CLASS[delta.tone]
                      )}
                    >
                      {delta.text}
                    </span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className={ACCENT_STYLES.info.card}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="size-4 text-muted-foreground" />
                  Department Meeting Overview
                </CardTitle>
                <CardDescription>
                  Meeting status per department (based on selected filters)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {departmentStatusCounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No meetings in this range.</p>
                ) : (
                  <>
                    <div className="space-y-3">
                      {departmentStatusCounts.map((d) => (
                        <div
                          key={d.label}
                          className="grid items-center gap-3"
                          style={{ gridTemplateColumns: "5.5rem 1fr 2rem" }}
                        >
                          <span className="truncate text-sm font-medium">{d.label}</span>
                          <div className="flex h-8 gap-[3px] rounded-md bg-muted p-[3px]">
                            <div
                              className="flex h-full gap-[3px]"
                              style={{ width: `${(d.total / axisMax) * 100}%` }}
                            >
                              {STATUS_SEGMENT_ORDER.filter((s) => d.counts[s]).map((s) => (
                                <div
                                  key={s}
                                  className={cn(
                                    "flex h-full items-center justify-center rounded-[4px] text-sm font-bold text-white shadow-sm",
                                    STATUS_SEGMENT_BAR_CLASS[s]
                                  )}
                                  style={{ width: `${((d.counts[s] ?? 0) / d.total) * 100}%` }}
                                >
                                  {d.counts[s]}
                                </div>
                              ))}
                            </div>
                          </div>
                          <span className="text-right text-sm font-bold">{d.total}</span>
                        </div>
                      ))}
                    </div>

                    <div className="grid items-center gap-3" style={{ gridTemplateColumns: "5.5rem 1fr 2rem" }}>
                      <span />
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        {axisTicks.map((tick) => (
                          <span key={tick}>{tick}</span>
                        ))}
                      </div>
                      <span />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-3">
                      {STATUS_SEGMENT_ORDER.map((s) => (
                        <div key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className={cn("size-2.5 shrink-0 rounded-full", STATUS_SEGMENT_BAR_CLASS[s])} />
                          {STATUS_SEGMENT_LABEL[s]}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className={ACCENT_STYLES.warning.card}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" />
                  Action items approaching due
                  <span className="font-normal text-muted-foreground">— next 14 days</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[22rem] overflow-y-auto p-0">
                {dueSoon.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-muted-foreground">Nothing due in the next 14 days.</p>
                ) : (
                  <div className="overflow-x-auto">
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
                            <td className="max-w-40 truncate px-6 py-2.5 font-medium">{item.title}</td>
                            <td className="max-w-32 truncate px-3 py-2.5 text-muted-foreground">{item.meetingTitle}</td>
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
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className={ACCENT_STYLES.primary.card}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
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
                    <span className="min-w-0 flex-1 truncate font-medium sm:w-40 sm:flex-none">{item.title}</span>
                    <div className="hidden h-2 flex-1 overflow-hidden rounded-full bg-muted sm:block">
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

          <Card className={ACCENT_STYLES.success.card}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
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
