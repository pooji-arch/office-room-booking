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
import { MeetingCalendarGrid } from "@/components/shared/MeetingCalendarGrid"
import { MeetingDetailsDialogBody } from "@/components/shared/MeetingDetailsDialogBody"
import { useMeetings } from "@/hooks/useMeetings"
import { useRooms } from "@/hooks/useRooms"
import { getWeekDays } from "@/lib/week"
import { formatDateShort, parseDateInputValue, toDateInputValue } from "@/lib/format"

export function CalendarViewPage() {
  const navigate = useNavigate()
  // Backed by the URL, not useState — clicking a meeting now navigates away
  // to its full details page and back, which remounts this page. Keeping
  // the browsed date/view/room in the URL means "Back" actually lands you
  // where you were, not reset to today's week view with no room filter.
  const [searchParams, setSearchParams] = useSearchParams()
  const view = (searchParams.get("view") as "week" | "day" | null) ?? "week"
  const roomId = searchParams.get("roomId") ?? "all"
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

  const { data: rooms } = useRooms({ pageSize: 100 })
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
      <h1 className="text-2xl font-extrabold tracking-tight">Calendar View</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
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

              <p className="pt-2 text-sm font-medium">Status</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-muted/50">
                  <span className="size-2.5 rounded-full bg-success shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-success/60" />
                  Confirmed
                </div>
                <div className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-muted/50">
                  <span className="size-2.5 rounded-full bg-primary shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-primary/60" />
                  Completed
                </div>
                <div className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-muted/50">
                  <span className="size-2.5 rounded-full bg-warning shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-warning/60" />
                  Rescheduled
                </div>
                <div className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-muted/50">
                  <span className="size-2.5 rounded-full bg-destructive shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-destructive/60" />{" "}
                Cancelled
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
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

          <MeetingCalendarGrid
            days={days}
            meetings={data?.data ?? []}
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
