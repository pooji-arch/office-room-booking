import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { TimeRangeInput } from "@/components/shared/TimeRangeInput"
import type { useAdminBookingEditor } from "@/hooks/useAdminBookingEditor"
import { formatDateLong, parseDateInputValue, toDateInputValue } from "@/lib/format"

// The "Edit & Reassign Booking" form — shared between the full admin
// BookingDetailsPage and the calendar's popup dialog, both driven by the
// same useAdminBookingEditor hook, so what's editable/valid/submittable
// can't drift between the two surfaces.
export function AdminBookingEditorForm({
  editor,
  onSaved,
}: {
  editor: ReturnType<typeof useAdminBookingEditor>
  onSaved?: () => void
}) {
  const { booking, users, rooms, availability, isLoadingSlots, isSaving, onSubmit, form, schedule } = editor
  if (!booking) return null

  async function handleSave() {
    if (await onSubmit()) onSaved?.()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Edit & Reassign Booking</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="mb-1.5">Assign To *</Label>
          <Select value={form.bookedById} onValueChange={form.setBookedById}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {users?.data.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name} — {u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5">Room *</Label>
          <Select value={schedule.effectiveRoomId} onValueChange={schedule.setRoomId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rooms?.data.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {availability && !availability.roomBookable && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            This room isn't available for booking right now.
          </div>
        )}

        <Card className="py-2">
          <CardContent className="px-2">
            <Calendar
              mode="single"
              selected={schedule.selectedDate ?? parseDateInputValue(booking.date)}
              onSelect={(d) => d && schedule.setSelectedDate(d)}
              disabled={(d) => toDateInputValue(d) < toDateInputValue(new Date())}
              className="w-full"
            />
          </CardContent>
        </Card>

        <div>
          <p className="mb-2 text-sm font-medium">{formatDateLong(schedule.effectiveDateStr)}</p>
          {isLoadingSlots ? (
            <Loader2 className="size-5 animate-spin text-primary" />
          ) : (
            <TimeRangeInput
              key={`${schedule.effectiveRoomId}-${schedule.effectiveDateStr}`}
              date={schedule.effectiveDateStr}
              bookedRanges={availability?.bookedRanges ?? []}
              defaultStart={booking.startTime}
              defaultEnd={booking.endTime}
              onChange={schedule.setSelectedRange}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1.5">Purpose *</Label>
            <Input value={form.purpose} onChange={(e) => form.setPurpose(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5">Attendees</Label>
            <Input
              type="number"
              min={1}
              value={form.attendees}
              onChange={(e) => form.setAttendees(Number(e.target.value) || 1)}
            />
          </div>
        </div>

        <div>
          <Label className="mb-1.5">Reason</Label>
          <Textarea
            placeholder="Enter reason for reassignment"
            rows={2}
            value={form.reason}
            onChange={(e) => form.setReason(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">Optional — only used if reassigning</p>
        </div>

        <Button
          type="button"
          className="w-full"
          disabled={isSaving || booking.status === "CANCELLED" || !schedule.effectiveRange}
          onClick={handleSave}
        >
          {isSaving && <Loader2 className="size-4 animate-spin" />}
          Save Changes
        </Button>
        {booking.status === "CANCELLED" && (
          <p className="text-center text-xs text-muted-foreground">
            This booking is cancelled and can no longer be edited.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
