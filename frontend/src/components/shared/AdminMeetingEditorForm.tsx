import { useState } from "react"
import { CalendarDays, ChevronRight, Loader2 } from "lucide-react"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TimeRangeInput } from "@/components/shared/TimeRangeInput"
import type { useAdminMeetingEditor } from "@/hooks/useAdminMeetingEditor"
import { formatDateMedium, formatTimeRange, parseDateInputValue, toDateInputValue } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { MeetingType } from "@/types"

const MEETING_TYPES: MeetingType[] = ["INTERNAL", "CLIENT", "REVIEW", "OTHER"]

// The "Edit & Reassign" form — its own dedicated page (MeetingEditPage),
// driven by useAdminMeetingEditor.
export function AdminMeetingEditorForm({
  editor,
  onSaved,
}: {
  editor: ReturnType<typeof useAdminMeetingEditor>
  onSaved?: () => void
}) {
  const { meeting, users, rooms, availability, isLoadingSlots, isSaving, onSubmit, form, schedule } = editor
  const [dateTimeOpen, setDateTimeOpen] = useState(false)
  if (!meeting) return null

  async function handleSave() {
    if (await onSubmit()) onSaved?.()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Edit & Reassign Meeting</CardTitle>
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

        <div>
          <Label className="mb-1.5">Date & Time *</Label>
          <Popover open={dateTimeOpen} onOpenChange={setDateTimeOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="mt-1.5 flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
              >
                <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">
                  {schedule.effectiveRange
                    ? `${formatDateMedium(schedule.effectiveDateStr)} · ${formatTimeRange(schedule.effectiveRange.start, schedule.effectiveRange.end)}`
                    : `${formatDateMedium(schedule.effectiveDateStr)} · Pick a time`}
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
                selected={schedule.selectedDate ?? parseDateInputValue(meeting.date)}
                onSelect={(d) => d && schedule.setSelectedDate(d)}
                disabled={(d) => toDateInputValue(d) < toDateInputValue(new Date())}
              />
              <div className="mt-2 border-t pt-3">
                {isLoadingSlots ? (
                  <Loader2 className="size-5 animate-spin text-primary" />
                ) : (
                  <TimeRangeInput
                    key={`${schedule.effectiveRoomId}-${schedule.effectiveDateStr}`}
                    date={schedule.effectiveDateStr}
                    bookedRanges={availability?.bookedRanges ?? []}
                    defaultStart={meeting.startTime}
                    defaultEnd={meeting.endTime}
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1.5">Purpose *</Label>
            <Input value={form.purpose} onChange={(e) => form.setPurpose(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5">Department</Label>
            <Input value={form.department} onChange={(e) => form.setDepartment(e.target.value)} />
          </div>
        </div>

        <div>
          <Label className="mb-1.5">Type</Label>
          <Select value={form.type} onValueChange={(v) => form.setType(v as MeetingType)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEETING_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          disabled={isSaving || meeting.status === "CANCELLED" || !schedule.effectiveRange}
          onClick={handleSave}
        >
          {isSaving && <Loader2 className="size-4 animate-spin" />}
          Save Changes
        </Button>
        {meeting.status === "CANCELLED" && (
          <p className="text-center text-xs text-muted-foreground">
            This meeting is cancelled and can no longer be edited.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
