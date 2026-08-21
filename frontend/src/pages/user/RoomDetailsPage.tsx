import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, CalendarDays, Loader2, Users, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { RoomImagePlaceholder } from "@/components/shared/RoomImagePlaceholder"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { TimeRangeInput } from "@/components/shared/TimeRangeInput"
import { useRoom, useRoomAvailability } from "@/hooks/useRooms"
import { useCreateBooking } from "@/hooks/useBookings"
import { useAuth } from "@/hooks/useAuth"
import { formatDateLong, parseDateInputValue, toDateInputValue } from "@/lib/format"

const schema = z.object({
  purpose: z.string().min(1, "Purpose is required"),
  attendees: z.coerce.number().int().min(1, "At least 1 attendee"),
})

type FormValues = z.infer<typeof schema>

export function RoomDetailsPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const initialDateParam = searchParams.get("date")
  const [selectedDate, setSelectedDate] = useState<Date>(
    initialDateParam ? parseDateInputValue(initialDateParam) : new Date()
  )
  const dateStr = toDateInputValue(selectedDate)
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null)

  const { data: room, isLoading } = useRoom(id)
  const { data: availability, isLoading: isLoadingSlots } = useRoomAvailability(id, dateStr)
  const createBooking = useCreateBooking()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { purpose: "", attendees: 1 },
  })

  useEffect(() => {
    setSelectedSlot(null)
  }, [dateStr])

  async function onSubmit(values: FormValues) {
    if (!id || !user) return
    if (!selectedSlot) {
      toast.error("Select an available time slot first")
      return
    }
    try {
      const booking = await createBooking.mutateAsync({
        roomId: id,
        date: dateStr,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        bookedById: user.id,
        purpose: values.purpose,
        attendees: values.attendees,
      })
      toast.success("Room booked")
      navigate(`/my-bookings/${booking.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to book room")
    }
  }

  if (isLoading || !room) {
    return <Loader2 className="size-6 animate-spin text-primary" />
  }

  const isBookable = room.status === "AVAILABLE"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{room.name}</h1>
          <StatusBadge status={room.status} />
        </div>
        <Button variant="outline" onClick={() => navigate(`/rooms/${id}/calendar`)}>
          <CalendarDays className="size-4" />
          Calendar View
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {room.imageUrl ? (
            <img
              src={room.imageUrl}
              alt={room.name}
              className="h-64 w-full rounded-xl object-cover"
            />
          ) : (
            <RoomImagePlaceholder seed={room.id} className="h-64 w-full rounded-xl" />
          )}
          <Card>
            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="size-4" />
                Capacity {room.capacity} · {room.location}
              </div>
              {room.description && (
                <p className="text-sm text-muted-foreground">{room.description}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {isBookable ? (
            <>
              <Card className="py-2">
                <CardContent className="px-2">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => d && setSelectedDate(d)}
                    disabled={(d) => toDateInputValue(d) < toDateInputValue(new Date())}
                    className="w-full"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{formatDateLong(dateStr)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingSlots ? (
                    <Loader2 className="size-5 animate-spin text-primary" />
                  ) : (
                    <TimeRangeInput
                      key={dateStr}
                      date={dateStr}
                      bookedRanges={availability?.bookedRanges ?? []}
                      defaultStart={searchParams.get("time") ?? undefined}
                      onChange={setSelectedSlot}
                    />
                  )}

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                      <FormField
                        control={form.control}
                        name="purpose"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Purpose</FormLabel>
                            <FormControl>
                              <Textarea rows={2} placeholder="What's this booking for?" {...field} />
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
                              <Input type="number" min={1} max={room.capacity} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={!selectedSlot || createBooking.isPending}
                      >
                        {createBooking.isPending && <Loader2 className="size-4 animate-spin" />}
                        Book This Slot
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <EmptyState
                  icon={Wrench}
                  title="Not available for booking"
                  description={
                    room.status === "MAINTENANCE"
                      ? "This room isn't available for booking right now due to maintenance."
                      : "This room isn't available for booking right now."
                  }
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
