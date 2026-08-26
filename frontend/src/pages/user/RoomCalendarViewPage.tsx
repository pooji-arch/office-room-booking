import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { MeetingCalendarGrid } from "@/components/shared/MeetingCalendarGrid"
import { CalendarPageSkeleton } from "@/components/shared/PageSkeletons"
import { MeetingDetailsDialogBody } from "@/components/shared/MeetingDetailsDialogBody"
import { useMeetings } from "@/hooks/useMeetings"
import { useRoom } from "@/hooks/useRooms"
import { useAuth } from "@/hooks/useAuth"
import { getWeekDays } from "@/lib/week"
import { formatDateShort, toDateInputValue } from "@/lib/format"
import type { Meeting } from "@/types"

export function RoomCalendarViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<"week" | "day">("week")
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)

  const { data: room, isLoading: isLoadingRoom } = useRoom(id)
  const days = useMemo(
    () => (view === "week" ? getWeekDays(selectedDate) : [toDateInputValue(selectedDate)]),
    [selectedDate, view]
  )

  const { data } = useMeetings({
    roomId: id,
    dateFrom: days[0],
    dateTo: days[days.length - 1],
    pageSize: 200,
  })

  function shift(count: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + count * (view === "week" ? 7 : 1))
    setSelectedDate(d)
  }

  function handleMeetingClick(meeting: Meeting) {
    setSelectedMeetingId(meeting.id)
  }

  const rangeLabel =
    view === "week"
      ? `${formatDateShort(days[0])} – ${formatDateShort(days[days.length - 1])}`
      : formatDateShort(days[0])

  if (isLoadingRoom || !room) {
    return <CalendarPageSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate(`/rooms/${id}`)}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{room.name} · Calendar</h1>
      </div>

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
            <CardContent className="space-y-1 pt-4 text-sm text-muted-foreground">
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
                <span className="size-2.5 rounded-full bg-muted-foreground/50" /> Cancelled
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
            onMeetingClick={handleMeetingClick}
            emptyHint="No meetings in this range."
            currentUserId={user?.id}
          />
        </div>
      </div>

      <Dialog open={!!selectedMeetingId} onOpenChange={(o) => !o && setSelectedMeetingId(null)}>
        <DialogContent className="sm:max-w-xl">
          {selectedMeetingId && (
            <MeetingDetailsDialogBody key={selectedMeetingId} meetingId={selectedMeetingId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
