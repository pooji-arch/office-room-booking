import { useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { MeetingCalendarGrid } from "@/components/shared/MeetingCalendarGrid"
import { CalendarPageSkeleton } from "@/components/shared/PageSkeletons"
import { MeetingDetailsDialogBody } from "@/components/shared/MeetingDetailsDialogBody"
import { useActionItems, useMeetingParticipants, useMeetings } from "@/hooks/useMeetings"
import { useRoom } from "@/hooks/useRooms"
import { useAuth } from "@/hooks/useAuth"
import { getWeekDays } from "@/lib/week"
import { formatDateShort, parseDateInputValue, toDateInputValue } from "@/lib/format"
import type { Meeting } from "@/types"

export function RoomCalendarViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  // Backed by the URL, not useState — clicking a meeting now navigates away
  // to its full details page and back, which remounts this page. Keeping
  // the browsed date/view in the URL means "Back" actually lands you where
  // you were, not reset to today's week view (the same fix already applied
  // to the meetings list pages for the same reason).
  const [searchParams, setSearchParams] = useSearchParams()
  const view = (searchParams.get("view") as "week" | "day" | null) ?? "week"
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

  const { data: room, isLoading: isLoadingRoom } = useRoom(id)
  const days = useMemo(
    () => (view === "week" ? getWeekDays(parseDateInputValue(dateStr)) : [dateStr]),
    [dateStr, view]
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

  // Same three-way access check UserMeetingDetailsPage itself uses to decide
  // whether to show "Meeting not found" — mirrored here so the popup's
  // "View Full Details" button only appears when it would actually work.
  // This calendar shows every meeting booked for the room, most of which
  // belong to other people.
  const selectedMeeting = data?.data.find((m) => m.id === selectedMeetingId)
  const { data: selectedParticipants } = useMeetingParticipants(selectedMeetingId ?? undefined)
  const { data: selectedActionItems } = useActionItems(selectedMeetingId ?? undefined)
  const selectedMeetingBelongsToUser =
    !!selectedMeeting &&
    (selectedMeeting.bookedBy.id === user?.id ||
      !!selectedParticipants?.some((p) => p.profileId === user?.id) ||
      !!selectedActionItems?.some((item) => item.ownerId === user?.id))

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
        {/* Deliberately not navigate(-1): this page has exactly one real
            origin (its own room's Details page, via the "Calendar View"
            button there), so replacing straight to it collapses this
            history entry rather than just popping it. Reported live as
            still toggling back and forth with navigate(-1) on some
            browsers even though it verified correctly here — replace
            removes the ambiguity entirely instead of depending on the
            browser's exact "-1" semantics matching what was tested. */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate(`/rooms/${id}`, { replace: true })}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-extrabold tracking-tight">{room.name} · Calendar</h1>
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
                <span className="size-2.5 rounded-full bg-destructive shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-destructive/60" />{" "}
                Cancelled
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
            <MeetingDetailsDialogBody
              key={selectedMeetingId}
              meetingId={selectedMeetingId}
              onViewDetails={
                selectedMeetingBelongsToUser ? () => navigate(`/meetings/${selectedMeetingId}`) : undefined
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
