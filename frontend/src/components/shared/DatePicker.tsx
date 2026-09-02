import { useState } from "react"
import { CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatDateMedium, parseDateInputValue, toDateInputValue } from "@/lib/format"
import { cn } from "@/lib/utils"

// Native <input type="date"> can't be restyled — its calendar popup is
// rendered by the OS/browser itself, completely outside CSS's reach. This
// is a fully custom replacement built from the app's own themed Calendar
// component (already used in the booking/reassign date-time popovers), so
// every date field in the app opens the same, on-brand picker.
export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  minDate,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** YYYY-MM-DD — compared as strings to sidestep time-of-day pitfalls with
   * comparing raw Date objects (e.g. "today" excluding itself once the
   * clock ticks past midnight-relative-to-construction-time). */
  minDate?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("justify-start font-normal", !value && "text-muted-foreground", className)}
        >
          <CalendarDays className="size-4 shrink-0" />
          <span className="truncate">{value ? formatDateMedium(value) : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <Calendar
          mode="single"
          selected={value ? parseDateInputValue(value) : undefined}
          onSelect={(d) => {
            if (!d) return
            onChange(toDateInputValue(d))
            setOpen(false)
          }}
          disabled={minDate ? (d) => toDateInputValue(d) < minDate : undefined}
        />
      </PopoverContent>
    </Popover>
  )
}
