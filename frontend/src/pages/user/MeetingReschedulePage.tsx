import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, CalendarDays, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TimeRangeInput } from "@/components/shared/TimeRangeInput"
import { FormPageSkeleton } from "@/components/shared/PageSkeletons"
import { useMeeting, useRescheduleMeeting } from "@/hooks/useMeetings"
import { useRoomAvailability } from "@/hooks/useRooms"
import { formatDateMedium, formatTimeRange, parseDateInputValue, toDateInputValue } from "@/lib/format"
import { cn } from "@/lib/utils"

// Matches RoomDetailsPage's own booking flow (compact popover trigger, not
// an always-open calendar taking up most of the page) — the two flows are
// picking the same kind of thing and previously looked nothing alike.
export function MeetingReschedulePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: meeting, isLoading } = useMeeting(id)
  const rescheduleMeeting = useRescheduleMeeting()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  // Keyed by date, same reasoning as RoomDetailsPage's own booking form:
  // switching to a different date to compare options and back shouldn't
  // throw away the slot you'd already picked for the original date.
  const [slotsByDate, setSlotsByDate] = useState<Record<string, { start: string; end: string }>>({})
  const [dateTimeOpen, setDateTimeOpen] = useState(false)

  const dateStr = selectedDate ? toDateInputValue(selectedDate) : (meeting?.date ?? "")
  const selectedSlot = slotsByDate[dateStr] ?? null
  function setSelectedSlot(slot: { start: string; end: string } | null) {
    setSlotsByDate((prev) => {
      if (!slot) {
        const { [dateStr]: _removed, ...rest } = prev
        return rest
      }
      return { ...prev, [dateStr]: slot }
    })
  }

  const { data: availability, isLoading: isLoadingSlots } = useRoomAvailability(
    meeting?.roomId,
    dateStr || undefined,
    meeting?.id
  )

  useEffect(() => {
    if (meeting && !selectedDate) {
      setSelectedDate(parseDateInputValue(meeting.date))
      setSlotsByDate({ [meeting.date]: { start: meeting.startTime, end: meeting.endTime } })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting])

  if (isLoading || !meeting) {
    return <FormPageSkeleton fields={3} />
  }

  async function onReschedule() {
    if (!meeting || !selectedSlot) return
    try {
      await rescheduleMeeting.mutateAsync({
        id: meeting.id,
        input: { date: dateStr, startTime: selectedSlot.start, endTime: selectedSlot.end },
      })
      toast.success("Meeting rescheduled")
      navigate(`/meetings/${meeting.id}`, { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reschedule meeting")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {/* replace, not a plain push: the "Reschedule" button on Meeting
            Details also replaces into this page (see
            UserMeetingDetailsPage) — matching on both sides keeps this
            meeting's history footprint to exactly one entry, same fix and
            same reasoning as Room Details <-> Calendar View. */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate(`/meetings/${meeting.id}`, { replace: true })}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Reschedule Meeting</h1>
      </div>

      <div className="max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{meeting.title || meeting.purpose}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Popover open={dateTimeOpen} onOpenChange={setDateTimeOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                >
                  <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">
                    {selectedSlot
                      ? `${formatDateMedium(dateStr)} · ${formatTimeRange(selectedSlot.start, selectedSlot.end)}`
                      : `${formatDateMedium(dateStr)} · Pick a time`}
                  </span>
                  <ChevronRight
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      dateTimeOpen && "rotate-90"
                    )}
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto max-h-[min(28rem,var(--radix-popover-content-available-height))] overflow-y-auto p-3"
                align="start"
              >
                <Calendar
                  mode="single"
                  selected={selectedDate ?? parseDateInputValue(meeting.date)}
                  onSelect={(d) => d && setSelectedDate(d)}
                  disabled={(d) => toDateInputValue(d) < toDateInputValue(new Date())}
                />
                <div className="mt-2 border-t pt-3">
                  {isLoadingSlots ? (
                    <Loader2 className="size-5 animate-spin text-primary" />
                  ) : (
                    <TimeRangeInput
                      key={dateStr}
                      date={dateStr}
                      bookedRanges={availability?.bookedRanges ?? []}
                      defaultStart={selectedSlot?.start}
                      defaultEnd={selectedSlot?.end}
                      onChange={setSelectedSlot}
                    />
                  )}
                </div>
                <Button type="button" className="mt-3 w-full" size="sm" onClick={() => setDateTimeOpen(false)}>
                  Done
                </Button>
              </PopoverContent>
            </Popover>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/meetings/${meeting.id}`, { replace: true })}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!selectedSlot || rescheduleMeeting.isPending}
                onClick={onReschedule}
              >
                {rescheduleMeeting.isPending && <Loader2 className="size-4 animate-spin" />}
                Confirm Reschedule
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
