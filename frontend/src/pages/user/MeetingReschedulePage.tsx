import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { TimeRangeInput } from "@/components/shared/TimeRangeInput"
import { FormPageSkeleton } from "@/components/shared/PageSkeletons"
import { useMeeting, useRescheduleMeeting } from "@/hooks/useMeetings"
import { useRoomAvailability } from "@/hooks/useRooms"
import { formatDateLong, parseDateInputValue, toDateInputValue } from "@/lib/format"

export function MeetingReschedulePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: meeting, isLoading } = useMeeting(id)
  const rescheduleMeeting = useRescheduleMeeting()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null)

  const dateStr = selectedDate ? toDateInputValue(selectedDate) : (meeting?.date ?? "")
  const { data: availability, isLoading: isLoadingSlots } = useRoomAvailability(
    meeting?.roomId,
    dateStr || undefined,
    meeting?.id
  )

  useEffect(() => {
    if (meeting && !selectedDate) {
      setSelectedDate(parseDateInputValue(meeting.date))
      setSelectedSlot({ start: meeting.startTime, end: meeting.endTime })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting])

  useEffect(() => {
    setSelectedSlot(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr])

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
      navigate(`/meetings/${meeting.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reschedule meeting")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate(`/meetings/${meeting.id}`)}>
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
            <Card className="py-2">
              <CardContent className="px-2">
                <Calendar
                  mode="single"
                  selected={selectedDate ?? parseDateInputValue(meeting.date)}
                  onSelect={(d) => d && setSelectedDate(d)}
                  disabled={(d) => toDateInputValue(d) < toDateInputValue(new Date())}
                  className="w-full"
                />
              </CardContent>
            </Card>

            <div>
              <p className="mb-2 text-sm font-medium">{formatDateLong(dateStr)}</p>
              {isLoadingSlots ? (
                <Loader2 className="size-5 animate-spin text-primary" />
              ) : (
                <TimeRangeInput
                  key={dateStr}
                  date={dateStr}
                  bookedRanges={availability?.bookedRanges ?? []}
                  defaultStart={meeting.startTime}
                  defaultEnd={meeting.endTime}
                  onChange={setSelectedSlot}
                />
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(`/meetings/${meeting.id}`)}>
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
