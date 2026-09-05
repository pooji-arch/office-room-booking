import { useState } from "react"
import { CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TimeSelect } from "@/components/shared/TimeSelect"
import { formatDateMedium, formatTime12h, parseDateInputValue, toDateInputValue } from "@/lib/format"
import { cn } from "@/lib/utils"

// Date and time live in one popover, time picked directly below the
// calendar grid — same layout as the booking flow's own Date & Time picker
// (RoomDetailsPage), reused here for a filter instead of a required field.
// Deliberately not two separate buttons (a date one and a time one): the
// user asked for time "integrated below the calendar... instead of
// separate."
export function DateTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  placeholder = "Any date",
  minDate,
  className,
}: {
  date: string // "" | YYYY-MM-DD
  time: string // "" | HH:mm
  onDateChange: (value: string) => void
  onTimeChange: (value: string) => void
  placeholder?: string
  /** YYYY-MM-DD — compared as strings, same reasoning as DatePicker. */
  minDate?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  const label = date ? (time ? `${formatDateMedium(date)} · ${formatTime12h(time)}` : formatDateMedium(date)) : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("justify-start font-normal", !date && "text-muted-foreground", className)}
        >
          <CalendarDays className="size-4 shrink-0" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto max-h-[min(28rem,var(--radix-popover-content-available-height))] overflow-y-auto p-3"
        align="start"
      >
        <Calendar
          mode="single"
          selected={date ? parseDateInputValue(date) : undefined}
          onSelect={(d) => d && onDateChange(toDateInputValue(d))}
          disabled={minDate ? (d) => toDateInputValue(d) < minDate : undefined}
        />
        <div className="mt-2 border-t pt-3">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Time</p>
          <TimeSelect value={time || "09:00"} onChange={onTimeChange} />
        </div>
        <Button type="button" className="mt-3 w-full" size="sm" onClick={() => setOpen(false)}>
          Done
        </Button>
      </PopoverContent>
    </Popover>
  )
}
