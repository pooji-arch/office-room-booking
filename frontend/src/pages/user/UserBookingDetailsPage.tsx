import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, Loader2, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { EmptyState } from "@/components/shared/EmptyState"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { BookingDetailsCard } from "@/components/shared/BookingDetailsCard"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { TimeRangeInput } from "@/components/shared/TimeRangeInput"
import { useBooking, useCancelBooking, useRescheduleBooking } from "@/hooks/useBookings"
import { useRoomAvailability } from "@/hooks/useRooms"
import { useAuth } from "@/hooks/useAuth"
import { bookingDisplayStatus } from "@/lib/booking-buckets"
import { formatDateLong, parseDateInputValue, toDateInputValue } from "@/lib/format"

export function UserBookingDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: booking, isLoading } = useBooking(id)
  const cancelBooking = useCancelBooking()
  const rescheduleBooking = useRescheduleBooking()
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null)

  const dateStr = selectedDate ? toDateInputValue(selectedDate) : (booking?.date ?? "")
  const { data: availability, isLoading: isLoadingSlots } = useRoomAvailability(
    showReschedule ? booking?.roomId : undefined,
    showReschedule ? dateStr : undefined,
    booking?.id
  )

  useEffect(() => {
    setSelectedSlot(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr])

  if (isLoading) {
    return <Loader2 className="size-6 animate-spin text-primary" />
  }

  if (!booking || booking.bookedBy.id !== user?.id) {
    return (
      <EmptyState
        icon={SearchX}
        title="Booking not found"
        description="This booking doesn't exist or isn't yours to view."
        action={<Button onClick={() => navigate("/my-bookings")}>Back to My Bookings</Button>}
      />
    )
  }

  const displayStatus = bookingDisplayStatus(booking)
  const isFinal = displayStatus === "CANCELLED" || displayStatus === "COMPLETED"

  async function confirmCancel() {
    if (!booking) return
    try {
      await cancelBooking.mutateAsync({ id: booking.id })
      toast.success("Booking cancelled")
      setShowCancelConfirm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel booking")
    }
  }

  function openReschedule() {
    if (!booking) return
    setSelectedDate(parseDateInputValue(booking.date))
    setSelectedSlot({ start: booking.startTime, end: booking.endTime })
    setShowReschedule(true)
  }

  async function onReschedule() {
    if (!booking || !selectedSlot) return
    try {
      await rescheduleBooking.mutateAsync({
        id: booking.id,
        input: { date: dateStr, startTime: selectedSlot.start, endTime: selectedSlot.end },
      })
      toast.success("Booking rescheduled")
      setShowReschedule(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reschedule booking")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate("/my-bookings")}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Booking Details</h1>
        </div>
        <StatusBadge status={displayStatus} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <BookingDetailsCard booking={booking} />
          {!isFinal && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => setShowCancelConfirm(true)}
              >
                Cancel Booking
              </Button>
              <Button variant="outline" onClick={openReschedule}>
                Reschedule
              </Button>
            </div>
          )}
        </div>

        {showReschedule && !isFinal && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reschedule Booking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Card className="py-2">
                <CardContent className="px-2">
                  <Calendar
                    mode="single"
                    selected={selectedDate ?? parseDateInputValue(booking.date)}
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
                    defaultStart={booking.startTime}
                    defaultEnd={booking.endTime}
                    onChange={setSelectedSlot}
                  />
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowReschedule(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!selectedSlot || rescheduleBooking.isPending}
                  onClick={onReschedule}
                >
                  {rescheduleBooking.isPending && <Loader2 className="size-4 animate-spin" />}
                  Confirm Reschedule
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Cancel this booking?"
        description={`Booking ${booking.code} for ${booking.roomName} will be cancelled and the slot freed up.`}
        confirmLabel="Cancel Booking"
        destructive
        isLoading={cancelBooking.isPending}
        onConfirm={confirmCancel}
      />
    </div>
  )
}
