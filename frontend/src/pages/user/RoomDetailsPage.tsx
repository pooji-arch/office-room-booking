import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, CalendarDays, ChevronRight, Loader2, Users, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { RoomDetailsSkeleton } from "@/components/shared/PageSkeletons"
import { useRoom, useRoomAvailability } from "@/hooks/useRooms"
import { useAddParticipant, useCreateMeeting, useMeeting } from "@/hooks/useMeetings"
import { useAuth } from "@/hooks/useAuth"
import { meetingsService } from "@/services/meetings"
import { formatDateMedium, formatTimeRange, parseDateInputValue, toDateInputValue } from "@/lib/format"
import { MEETING_TYPE_OPTIONS } from "@/lib/meeting-buckets"
import { cn } from "@/lib/utils"
import type { MeetingType } from "@/types"

const schema = z.object({
  type: z.enum(["TACTICAL", "STRATEGY", "INTERNAL", "OTHER"]),
  purpose: z.string().min(1, "Purpose is required"),
  department: z.string().min(1, "Department is required"),
})

type FormValues = z.infer<typeof schema>

export function RoomDetailsPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const previousMeetingId = searchParams.get("previousMeetingId") ?? undefined
  const { data: previousMeeting } = useMeeting(previousMeetingId)

  const initialDateParam = searchParams.get("date")
  const [selectedDate, setSelectedDate] = useState<Date>(
    initialDateParam ? parseDateInputValue(initialDateParam) : new Date()
  )
  const dateStr = toDateInputValue(selectedDate)
  // Keyed by date so switching to a different date and back doesn't lose the
  // slot you'd already picked for the original date — previously a single
  // selectedSlot reset to null on every date change (see the removed effect
  // below), forcing a full re-pick any time you touched the date twice.
  const [slotsByDate, setSlotsByDate] = useState<Record<string, { start: string; end: string }>>({})
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

  const [dateTimeOpen, setDateTimeOpen] = useState(false)

  const { data: room, isLoading } = useRoom(id)
  const { data: availability, isLoading: isLoadingSlots } = useRoomAvailability(id, dateStr)
  const createMeeting = useCreateMeeting()
  const addParticipant = useAddParticipant()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: (searchParams.get("type") as MeetingType | null) ?? "INTERNAL",
      purpose: searchParams.get("purpose") ?? "",
      // The organizer's own department, not a pick — a user belongs to
      // exactly one department already, so there's nothing to choose here.
      department: user?.department ?? "",
    },
  })

  async function onSubmit(values: FormValues) {
    if (!id || !user) return
    if (!selectedSlot) {
      toast.error("Select an available time slot first")
      return
    }
    try {
      const meeting = await createMeeting.mutateAsync({
        roomId: id,
        date: dateStr,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        bookedById: user.id,
        purpose: values.purpose,
        department: values.department,
        type: values.type,
        previousMeetingId,
      })

      let carryForwardFailed = false
      if (previousMeetingId) {
        try {
          const previousParticipants = await meetingsService.listParticipants(previousMeetingId)
          for (const p of previousParticipants) {
            if (p.profileId && p.profileId !== user.id) {
              await addParticipant.mutateAsync({
                meetingId: meeting.id,
                input: { profileId: p.profileId, role: p.role },
              })
            }
          }
        } catch {
          carryForwardFailed = true
        }
      }

      // Open action items from the previous meeting are NOT copied into new
      // agenda items here anymore — they'd just pile up as duplicate
      // "Follow-up: X" topics every time a chain of meetings continues.
      // Instead they stay as the same, single action item, and its progress
      // (Open/In Progress/Delayed/Done) is tracked and editable directly
      // from the follow-up meeting's Action Items History panel — see
      // ActionItemsCard's previous-meeting table.
      const pending = meeting.approvalStatus === "PENDING"
      if (previousMeetingId) {
        toast.success(
          carryForwardFailed
            ? "Follow-up meeting booked, but participants couldn't be copied — check the Agenda & RSVPs tab."
            : pending
              ? "Follow-up meeting requested — awaiting admin approval. Participants were carried forward."
              : "Follow-up meeting booked — participants were carried forward."
        )
      } else {
        toast.success(pending ? "Booking requested — awaiting admin approval" : "Room booked")
      }
      navigate(`/meetings/${meeting.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to book room")
    }
  }

  if (isLoading || !room) {
    return <RoomDetailsSkeleton />
  }

  const isBookable = room.status === "AVAILABLE"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-extrabold tracking-tight">{room.name}</h1>
          <StatusBadge status={room.status} />
        </div>
        {/* replace, not a normal push: Calendar View's own back arrow
            replaces back to this exact URL (see RoomCalendarViewPage) — if
            entering pushed a new entry instead, toggling into Calendar and
            back would leave two adjacent history entries both pointing at
            this same room, and the very next "back" click would silently
            land on the first one (visually identical, looks like nothing
            happened) before a second click was needed to actually reach
            Home. Matching replace on both sides keeps this room's history
            footprint to exactly one entry no matter how many times you
            toggle between its Details and Calendar views. */}
        <Button
          variant="outline"
          onClick={() => navigate(`/rooms/${id}/calendar`, { replace: true })}
        >
          <CalendarDays className="size-4" />
          Calendar View
        </Button>
      </div>

      {previousMeeting && (
        <div className="rounded-lg bg-accent p-3 text-sm text-accent-foreground">
          Scheduling a follow-up to meeting {previousMeeting.code}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          {room.imageUrl ? (
            <img
              src={room.imageUrl}
              alt={room.name}
              className="h-64 w-full rounded-xl object-cover lg:h-full lg:min-h-[22rem]"
            />
          ) : (
            <RoomImagePlaceholder seed={room.id} className="h-64 w-full rounded-xl lg:h-full lg:min-h-[22rem]" />
          )}
          {room.description && (
            <p className="text-sm text-muted-foreground">{room.description}</p>
          )}
        </div>

        <div>
          {isBookable ? (
            <Card>
              <CardContent className="space-y-4 pt-4">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="size-4" />
                  Capacity {room.capacity} · {room.location}
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                      <Label>
                        Date &amp; Time *
                      </Label>
                      <Popover open={dateTimeOpen} onOpenChange={setDateTimeOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="mt-1.5 flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
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
                            selected={selectedDate}
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
                                defaultStart={selectedSlot?.start ?? searchParams.get("time") ?? undefined}
                                defaultEnd={selectedSlot?.end}
                                onChange={setSelectedSlot}
                              />
                            )}
                          </div>
                          <Button
                            type="button"
                            className="mt-3 w-full"
                            size="sm"
                            onClick={() => setDateTimeOpen(false)}
                          >
                            Done
                          </Button>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meeting Type *</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {MEETING_TYPE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          {/* Your own department, not a pick — every user
                              belongs to exactly one, set on their profile. */}
                          <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                            {field.value || "Not set on your profile"}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="purpose"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purpose *</FormLabel>
                          <FormControl>
                            <Input placeholder="What's this booking for?" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={!selectedSlot || createMeeting.isPending}
                    >
                      {createMeeting.isPending && <Loader2 className="size-4 animate-spin" />}
                      Book This Slot
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Pick a date &amp; time and a department to enable booking.
                    </p>
                  </form>
                </Form>
              </CardContent>
            </Card>
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
