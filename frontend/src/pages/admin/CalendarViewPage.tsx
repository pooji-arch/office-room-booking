import { useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { RoomsWeekTimeline } from "@/components/shared/RoomsWeekTimeline"
import { MeetingDetailsDialogBody } from "@/components/shared/MeetingDetailsDialogBody"
import { useMeetings } from "@/hooks/useMeetings"
import { useRooms } from "@/hooks/useRooms"
import { useActiveUsers } from "@/hooks/useUsers"
import { getWeekDays } from "@/lib/week"
import { formatDateShort, parseDateInputValue, toDateInputValue } from "@/lib/format"
import { cn, dedupeCaseInsensitive } from "@/lib/utils"

const LEGEND_ITEMS = [
  { label: "Confirmed", dot: "bg-success shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-success/60" },
  { label: "Completed", dot: "bg-primary shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-primary/60" },
  { label: "Rescheduled", dot: "bg-warning shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-warning/60" },
  { label: "Pending Approval", dot: "border-2 border-dashed border-chart-6" },
  { label: "Cancelled", dot: "bg-destructive shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-destructive/60" },
] as const

export function CalendarViewPage() {
  const navigate = useNavigate()
  // Backed by the URL, not useState — clicking a meeting now navigates away
  // to its full details page and back, which remounts this page. Keeping
  // the browsed date/view/room in the URL means "Back" actually lands you
  // where you were, not reset to today's week view with no room filter.
  const [searchParams, setSearchParams] = useSearchParams()
  const view = (searchParams.get("view") as "week" | "day" | null) ?? "week"
  const roomId = searchParams.get("roomId") ?? "all"
  const approvalFilter = (searchParams.get("approval") as "APPROVED" | "PENDING" | null) ?? "all"
  const departmentFilter = searchParams.get("department") ?? "all"
  // Kept as a string, not just a derived Date, so useMemo below can depend
  // on a value that's actually stable across re-renders — a `new Date()`
  // recreated inline every render would otherwise defeat the memoization
  // (different object identity every time, even when the date hasn't
  // changed) and force `days` to recompute on every unrelated render.
  const dateStr = searchParams.get("date") ?? toDateInputValue(new Date())
  const selectedDate = parseDateInputValue(dateStr)
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)

  function updateParams(updates: Record<string, string>) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(updates)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        return next
      },
      { replace: true }
    )
  }

  function setSelectedDate(d: Date) {
    updateParams({ date: toDateInputValue(d) })
  }

  function setView(v: "week" | "day") {
    updateParams({ view: v })
  }

  function setRoomId(v: string) {
    updateParams({ roomId: v === "all" ? "" : v })
  }

  function setApprovalFilter(v: "all" | "APPROVED" | "PENDING") {
    updateParams({ approval: v === "all" ? "" : v })
  }

  function setDepartmentFilter(v: string) {
    updateParams({ department: v === "all" ? "" : v })
  }

  const { data: rooms } = useRooms({ pageSize: 100 })
  const { data: activeUsers } = useActiveUsers()
  const departments = useMemo(
    () => dedupeCaseInsensitive((activeUsers?.data ?? []).map((u) => u.department).filter(Boolean) as string[]),
    [activeUsers]
  )
  const days = useMemo(
    () => (view === "week" ? getWeekDays(parseDateInputValue(dateStr)) : [dateStr]),
    [dateStr, view]
  )

  const { data } = useMeetings({
    roomId: roomId === "all" ? undefined : roomId,
    dateFrom: days[0],
    dateTo: days[days.length - 1],
    pageSize: 200,
  })
  const visibleMeetings = (data?.data ?? []).filter((m) => {
    if (approvalFilter !== "all" && m.approvalStatus !== approvalFilter) return false
    if (departmentFilter !== "all" && (m.department ?? "").toLowerCase() !== departmentFilter.toLowerCase()) return false
    return true
  })

  function shift(days_: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days_ * (view === "week" ? 7 : 1))
    setSelectedDate(d)
  }

  const rangeLabel =
    view === "week"
      ? `${formatDateShort(days[0])} – ${formatDateShort(days[days.length - 1])}`
      : formatDateShort(days[0])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Calendar View</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("size-2.5 shrink-0 rounded-full", item.dot)} />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <div className="space-y-4">
          <Card className="py-2">
            <CardContent className="px-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                className="w-full"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 pt-4">
              <p className="text-sm font-medium">Room</p>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rooms</SelectItem>
                  {rooms?.data.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <p className="pt-2 text-sm font-medium">Booking Status</p>
              <div className="flex rounded-lg border p-0.5">
                {(["all", "APPROVED", "PENDING"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setApprovalFilter(v)}
                    className={cn(
                      "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                      approvalFilter === v
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {v === "all" ? "All" : v === "APPROVED" ? "Approved" : "Pending"}
                  </button>
                ))}
              </div>

              <p className="pt-2 text-sm font-medium">Department</p>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" onClick={() => shift(-1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
                Today
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => shift(1)}>
                <ChevronRight className="size-4" />
              </Button>
              <span className="ml-2 text-sm font-medium">{rangeLabel}</span>
            </div>
            <div className="flex rounded-lg border p-0.5">
              {(["week", "day"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                    view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <RoomsWeekTimeline
            rooms={roomId === "all" ? (rooms?.data ?? []) : (rooms?.data ?? []).filter((r) => r.id === roomId)}
            days={days}
            meetings={visibleMeetings}
            onMeetingClick={(m) => setSelectedMeetingId(m.id)}
            emptyHint="No meetings in this range."
          />
        </div>
      </div>

      <Dialog open={!!selectedMeetingId} onOpenChange={(o) => !o && setSelectedMeetingId(null)}>
        <DialogContent className="sm:max-w-xl">
          {selectedMeetingId && (
            <MeetingDetailsDialogBody
              key={selectedMeetingId}
              meetingId={selectedMeetingId}
              onViewDetails={() => navigate(`/admin/meetings/${selectedMeetingId}`)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
