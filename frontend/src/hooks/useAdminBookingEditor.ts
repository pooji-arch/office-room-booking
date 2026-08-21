import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useBooking, useCancelBooking, useReassignBooking, useUpdateBooking } from "@/hooks/useBookings"
import { useActiveUsers } from "@/hooks/useUsers"
import { useRoomAvailability, useRooms } from "@/hooks/useRooms"
import { bookingDisplayStatus } from "@/lib/booking-buckets"
import { toDateInputValue } from "@/lib/format"

type TimeRange = { start: string; end: string }

// Shared business logic behind the admin "Edit & Reassign Booking" flow —
// used by both the full BookingDetailsPage and the calendar's popup dialog,
// so the two surfaces can't quietly drift on what's editable/valid/submittable.
export function useAdminBookingEditor(bookingId: string | undefined) {
  const { data: booking, isLoading } = useBooking(bookingId)
  const { data: users } = useActiveUsers()
  const { data: rooms } = useRooms({ pageSize: 100 })
  const reassign = useReassignBooking()
  const updateBooking = useUpdateBooking()
  const cancelBooking = useCancelBooking()
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const [bookedById, setBookedById] = useState("")
  const [purpose, setPurpose] = useState("")
  const [attendees, setAttendees] = useState(1)
  const [reason, setReason] = useState("")
  const [roomId, _setRoomId] = useState<string | null>(null)
  const [selectedDate, _setSelectedDate] = useState<Date | null>(null)
  const [selectedRange, setSelectedRange] = useState<TimeRange | null>(null)

  useEffect(() => {
    if (booking) {
      setBookedById(booking.bookedBy.id)
      setPurpose(booking.purpose)
      setAttendees(booking.attendees)
    }
  }, [booking])

  function setRoomId(v: string) {
    _setRoomId(v)
    setSelectedRange(null)
  }

  function setSelectedDate(d: Date) {
    _setSelectedDate(d)
    setSelectedRange(null)
  }

  const effectiveRoomId = roomId ?? booking?.roomId ?? ""
  const effectiveDateStr = selectedDate ? toDateInputValue(selectedDate) : (booking?.date ?? "")
  // TimeRangeInput reports its own initial (default) value on mount, so
  // selectedRange is already populated once mounted — it's only ever null
  // while the user has actually left the fields in an invalid state, which
  // must correctly block Save rather than silently falling back to the
  // booking's original time.
  const effectiveRange = selectedRange

  const { data: availability, isLoading: isLoadingSlots } = useRoomAvailability(
    effectiveRoomId || undefined,
    effectiveDateStr || undefined,
    booking?.id
  )

  const displayStatus = booking ? bookingDisplayStatus(booking) : null
  const isReadOnly = displayStatus === "COMPLETED"
  const isSaving = reassign.isPending || updateBooking.isPending

  async function onSubmit(): Promise<boolean> {
    if (!booking || !effectiveRange) return false
    if (!purpose.trim()) {
      toast.error("Purpose is required")
      return false
    }
    try {
      const scheduleChanged =
        effectiveRoomId !== booking.roomId ||
        effectiveDateStr !== booking.date ||
        effectiveRange.start !== booking.startTime ||
        effectiveRange.end !== booking.endTime ||
        bookedById !== booking.bookedBy.id

      if (scheduleChanged) {
        await reassign.mutateAsync({
          id: booking.id,
          input: {
            roomId: effectiveRoomId,
            date: effectiveDateStr,
            startTime: effectiveRange.start,
            endTime: effectiveRange.end,
            bookedById,
            reason: reason || "Updated by admin",
          },
        })
      }
      if (purpose !== booking.purpose || attendees !== booking.attendees) {
        await updateBooking.mutateAsync({
          id: booking.id,
          input: { purpose, attendees },
        })
      }
      toast.success("Booking updated")
      setReason("")
      _setRoomId(null)
      _setSelectedDate(null)
      setSelectedRange(null)
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update booking")
      return false
    }
  }

  async function confirmCancel() {
    if (!booking) return
    try {
      await cancelBooking.mutateAsync({ id: booking.id, reason: "Cancelled by admin" })
      toast.success("Booking cancelled")
      setShowCancelConfirm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel booking")
    }
  }

  return {
    booking,
    isLoading,
    isReadOnly,
    displayStatus,
    users,
    rooms,
    availability,
    isLoadingSlots,
    isSaving,
    onSubmit,
    form: { bookedById, setBookedById, purpose, setPurpose, attendees, setAttendees, reason, setReason },
    schedule: {
      effectiveRoomId,
      effectiveDateStr,
      effectiveRange,
      selectedDate,
      setRoomId,
      setSelectedDate,
      setSelectedRange,
    },
    cancel: {
      show: showCancelConfirm,
      setShow: setShowCancelConfirm,
      confirm: confirmCancel,
      isPending: cancelBooking.isPending,
    },
  }
}
