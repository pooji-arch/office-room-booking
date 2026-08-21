import { Loader2 } from "lucide-react"
import { DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { BookingDetailsCard } from "@/components/shared/BookingDetailsCard"
import { BookingHistoryList } from "@/components/shared/BookingHistoryList"
import { useBooking } from "@/hooks/useBookings"
import { bookingDisplayStatus } from "@/lib/booking-buckets"

// The Admin Calendar's "expand a booking in place" popup — read-only
// details only, regardless of status. Editing/reassigning still happens on
// the dedicated admin/BookingDetailsPage.tsx (reached via the Eye/View
// action), not here.
export function BookingDetailsDialogBody({ bookingId }: { bookingId: string }) {
  const { data: booking, isLoading } = useBooking(bookingId)

  if (isLoading || !booking) {
    return <Loader2 className="size-6 animate-spin text-primary" />
  }

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {booking.code}
          <StatusBadge status={bookingDisplayStatus(booking)} />
        </DialogTitle>
      </DialogHeader>

      <BookingDetailsCard booking={booking} />
      <BookingHistoryList bookingId={booking.id} />
    </div>
  )
}
