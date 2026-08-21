import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { BookingDetailsCard } from "@/components/shared/BookingDetailsCard"
import { BookingHistoryList } from "@/components/shared/BookingHistoryList"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { AdminBookingEditorForm } from "@/components/shared/AdminBookingEditorForm"
import { useAdminBookingEditor } from "@/hooks/useAdminBookingEditor"

export function BookingDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editor = useAdminBookingEditor(id)
  const { booking, isLoading, isReadOnly, displayStatus } = editor

  if (isLoading || !booking || !displayStatus) {
    return <Loader2 className="size-6 animate-spin text-primary" />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate("/admin/bookings")}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Booking Details</h1>
        </div>
        <StatusBadge status={displayStatus} />
      </div>

      {isReadOnly ? (
        <div className="max-w-2xl space-y-4">
          <BookingDetailsCard booking={booking} />
          <BookingHistoryList bookingId={booking.id} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <BookingDetailsCard booking={booking} />
            <BookingHistoryList bookingId={booking.id} />
            {booking.status !== "CANCELLED" && (
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => editor.cancel.setShow(true)}
              >
                Cancel Booking
              </Button>
            )}
          </div>

          <AdminBookingEditorForm editor={editor} />
        </div>
      )}

      <ConfirmDialog
        open={editor.cancel.show}
        onOpenChange={editor.cancel.setShow}
        title="Cancel this booking?"
        description={`Booking ${booking.code} will be cancelled and the slot freed up for others.`}
        confirmLabel="Cancel Booking"
        destructive
        isLoading={editor.cancel.isPending}
        onConfirm={editor.cancel.confirm}
      />
    </div>
  )
}
