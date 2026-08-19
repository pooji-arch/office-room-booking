import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, Loader2, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { EmptyState } from "@/components/shared/EmptyState"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { BookingDetailsCard } from "@/components/shared/BookingDetailsCard"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { useBooking, useCancelBooking, useRescheduleBooking } from "@/hooks/useBookings"
import { useAuth } from "@/hooks/useAuth"
import { generateBusinessHourSlots } from "@/lib/business-hours"
import { bookingDisplayStatus } from "@/lib/booking-buckets"
import { formatTime12h } from "@/lib/format"

const rescheduleSchema = z.object({
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
})

type RescheduleValues = z.infer<typeof rescheduleSchema>

const slots = generateBusinessHourSlots()

export function UserBookingDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: booking, isLoading } = useBooking(id)
  const cancelBooking = useCancelBooking()
  const rescheduleBooking = useRescheduleBooking()
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)

  const form = useForm<RescheduleValues>({
    resolver: zodResolver(rescheduleSchema),
    defaultValues: { date: "", startTime: "", endTime: "" },
  })

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
    form.reset({ date: booking.date, startTime: booking.startTime, endTime: booking.endTime })
    setShowReschedule(true)
  }

  async function onReschedule(values: RescheduleValues) {
    if (!booking) return
    try {
      await rescheduleBooking.mutateAsync({ id: booking.id, input: values })
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
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onReschedule)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {slots.map((s) => (
                                <SelectItem key={s.start} value={s.start}>
                                  {formatTime12h(s.start)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {slots.map((s) => (
                                <SelectItem key={s.end} value={s.end}>
                                  {formatTime12h(s.end)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowReschedule(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={rescheduleBooking.isPending}>
                      {rescheduleBooking.isPending && <Loader2 className="size-4 animate-spin" />}
                      Confirm Reschedule
                    </Button>
                  </div>
                </form>
              </Form>
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
