import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { BookingDetailsCard } from "@/components/shared/BookingDetailsCard"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { useBooking, useCancelBooking, useReassignBooking, useUpdateBooking } from "@/hooks/useBookings"
import { useActiveUsers } from "@/hooks/useUsers"
import { useRooms } from "@/hooks/useRooms"
import { generateBusinessHourSlots } from "@/lib/business-hours"
import { bookingDisplayStatus } from "@/lib/booking-buckets"
import { formatTime12h } from "@/lib/format"

const schema = z.object({
  bookedById: z.string().min(1),
  roomId: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  purpose: z.string().min(1, "Purpose is required"),
  attendees: z.coerce.number().int().min(1),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function BookingDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: booking, isLoading } = useBooking(id)
  const { data: users } = useActiveUsers()
  const { data: rooms } = useRooms({ pageSize: 100 })
  const reassign = useReassignBooking()
  const updateBooking = useUpdateBooking()
  const cancelBooking = useCancelBooking()
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const slots = generateBusinessHourSlots()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      bookedById: "",
      roomId: "",
      date: "",
      startTime: "",
      endTime: "",
      purpose: "",
      attendees: 1,
      reason: "",
    },
  })

  useEffect(() => {
    if (booking) {
      form.reset({
        bookedById: booking.bookedBy.id,
        roomId: booking.roomId,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        purpose: booking.purpose,
        attendees: booking.attendees,
        reason: "",
      })
    }
  }, [booking, form])

  async function onSubmit(values: FormValues) {
    if (!booking) return
    try {
      const scheduleChanged =
        values.roomId !== booking.roomId ||
        values.date !== booking.date ||
        values.startTime !== booking.startTime ||
        values.endTime !== booking.endTime ||
        values.bookedById !== booking.bookedBy.id

      if (scheduleChanged) {
        await reassign.mutateAsync({
          id: booking.id,
          input: {
            roomId: values.roomId,
            date: values.date,
            startTime: values.startTime,
            endTime: values.endTime,
            bookedById: values.bookedById,
            reason: values.reason || "Updated by admin",
          },
        })
      }
      if (values.purpose !== booking.purpose || values.attendees !== booking.attendees) {
        await updateBooking.mutateAsync({
          id: booking.id,
          input: { purpose: values.purpose, attendees: values.attendees },
        })
      }
      toast.success("Booking updated")
      form.setValue("reason", "")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update booking")
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

  if (isLoading || !booking) {
    return <Loader2 className="size-6 animate-spin text-primary" />
  }

  const isSaving = reassign.isPending || updateBooking.isPending

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate("/admin/bookings")}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Booking Details</h1>
        </div>
        <StatusBadge status={bookingDisplayStatus(booking)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <BookingDetailsCard booking={booking} />
          {booking.status !== "CANCELLED" && (
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel Booking
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit & Reassign Booking</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="bookedById"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users?.data.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name} — {u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roomId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rooms?.data.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-3">
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

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="purpose"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purpose</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="attendees"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attendees</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter reason for reassignment"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Optional — only used if reassigning</FormDescription>
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isSaving || booking.status === "CANCELLED"}>
                  {isSaving && <Loader2 className="size-4 animate-spin" />}
                  Save Changes
                </Button>
                {booking.status === "CANCELLED" && (
                  <p className="text-center text-xs text-muted-foreground">
                    This booking is cancelled and can no longer be edited.
                  </p>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Cancel this booking?"
        description={`Booking ${booking.code} will be cancelled and the slot freed up for others.`}
        confirmLabel="Cancel Booking"
        destructive
        isLoading={cancelBooking.isPending}
        onConfirm={confirmCancel}
      />
    </div>
  )
}
