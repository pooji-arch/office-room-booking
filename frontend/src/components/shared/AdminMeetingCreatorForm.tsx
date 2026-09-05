import { useState } from "react"
import { CalendarDays, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TimeRangeInput } from "@/components/shared/TimeRangeInput"
import type { useAdminMeetingCreator } from "@/hooks/useAdminMeetingCreator"
import { formatDateMedium, formatTimeRange, toDateInputValue } from "@/lib/format"
import { MEETING_TYPE_OPTIONS } from "@/lib/meeting-buckets"
import { cn } from "@/lib/utils"
import type { MeetingType } from "@/types"

// The "Book a Meeting" form — admin's own dedicated page (MeetingCreatePage),
// driven by useAdminMeetingCreator. Same field shape as
// AdminMeetingEditorForm's Edit & Reassign form, minus the Reason field
// (nothing to reassign yet) and with no "meeting" to fall back to for
// display, since this creates a brand-new one.
export function AdminMeetingCreatorForm({
  creator,
  onCreated,
}: {
  creator: ReturnType<typeof useAdminMeetingCreator>
  onCreated?: (meetingId: string) => void
}) {
  const { users, rooms, departments, availability, isLoadingSlots, isSaving, onSubmit, form, schedule } = creator
  const [dateTimeOpen, setDateTimeOpen] = useState(false)

  async function handleBook() {
    const meetingId = await onSubmit()
    if (meetingId) onCreated?.(meetingId)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Book a Meeting</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="mb-1.5">Organizer *</Label>
          <Select value={form.bookedById} onValueChange={form.setBookedById}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an organizer" />
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
          <Select value={form.roomId} onValueChange={form.setRoomId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a room" />
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

        <div>
          <Label className="mb-1.5">Date & Time *</Label>
          <Popover open={dateTimeOpen} onOpenChange={setDateTimeOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={!form.roomId}
                className="mt-1.5 flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">
                  {!form.roomId
                    ? "Select a room first"
                    : schedule.selectedRange
                      ? `${formatDateMedium(schedule.dateStr)} · ${formatTimeRange(schedule.selectedRange.start, schedule.selectedRange.end)}`
                      : `${formatDateMedium(schedule.dateStr)} · Pick a time`}
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
                selected={schedule.selectedDate}
                onSelect={(d) => d && schedule.setSelectedDate(d)}
                disabled={(d) => toDateInputValue(d) < toDateInputValue(new Date())}
              />
              <div className="mt-2 border-t pt-3">
                {isLoadingSlots ? (
                  <Loader2 className="size-5 animate-spin text-primary" />
                ) : (
                  <TimeRangeInput
                    key={`${form.roomId}-${schedule.dateStr}`}
                    date={schedule.dateStr}
                    bookedRanges={availability?.bookedRanges ?? []}
                    onChange={schedule.setSelectedRange}
                  />
                )}
              </div>
              <Button type="button" className="mt-3 w-full" size="sm" onClick={() => setDateTimeOpen(false)}>
                Done
              </Button>
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label className="mb-1.5">Meeting Type *</Label>
          <Select value={form.type} onValueChange={(v) => form.setType(v as MeetingType)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEETING_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1.5">Purpose *</Label>
            <Input value={form.purpose} onChange={(e) => form.setPurpose(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5">Department *</Label>
            <Select value={form.department} onValueChange={form.setDepartment}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          type="button"
          className="w-full"
          disabled={isSaving || !form.roomId || !schedule.selectedRange || !form.purpose.trim() || !form.department.trim()}
          onClick={handleBook}
        >
          {isSaving && <Loader2 className="size-4 animate-spin" />}
          Book Meeting
        </Button>
      </CardContent>
    </Card>
  )
}
