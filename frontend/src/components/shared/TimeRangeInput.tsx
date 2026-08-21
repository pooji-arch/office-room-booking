import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  BUSINESS_HOURS_END,
  BUSINESS_HOURS_START,
  findConflict,
  isSlotInPast,
} from "@/lib/business-hours"
import { formatTime12h } from "@/lib/format"
import type { BookedRange } from "@/types"

interface TimeRangeInputProps {
  date: string
  bookedRanges: BookedRange[]
  defaultStart?: string
  defaultEnd?: string
  onChange: (value: { start: string; end: string } | null) => void
}

function getError(
  date: string,
  bookedRanges: BookedRange[],
  start: string,
  end: string
): string | null {
  if (!start || !end) return null
  if (end <= start) return "End time must be after start time."
  if (start < BUSINESS_HOURS_START) {
    return `Start time must be at or after ${formatTime12h(BUSINESS_HOURS_START)}.`
  }
  if (end > BUSINESS_HOURS_END) {
    return `End time must be at or before ${formatTime12h(BUSINESS_HOURS_END)}.`
  }
  if (isSlotInPast(date, { start })) {
    return "This time has already passed."
  }
  const conflict = findConflict(bookedRanges, start, end)
  if (conflict) {
    return `Conflicts with an existing booking from ${formatTime12h(conflict.start)} to ${formatTime12h(conflict.end)}.`
  }
  return null
}

export function TimeRangeInput({
  date,
  bookedRanges,
  defaultStart,
  defaultEnd,
  onChange,
}: TimeRangeInputProps) {
  const [start, setStart] = useState(defaultStart ?? "")
  const [end, setEnd] = useState(defaultEnd ?? "")

  function commit(nextStart: string, nextEnd: string) {
    const error = getError(date, bookedRanges, nextStart, nextEnd)
    onChange(nextStart && nextEnd && !error ? { start: nextStart, end: nextEnd } : null)
  }

  // Report the initial (default) value to the parent right away, not just on
  // edit — otherwise the parent can't tell "untouched, defaults are valid"
  // apart from "user typed something invalid" (both would read as the same
  // null), which would let Save silently fall back to stale data instead of
  // being disabled while an in-progress edit is actually invalid.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => commit(start, end), [])

  const error = getError(date, bookedRanges, start, end)

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1.5" htmlFor="time-range-start">
            Start Time
          </Label>
          <Input
            id="time-range-start"
            type="time"
            min={BUSINESS_HOURS_START}
            max={BUSINESS_HOURS_END}
            value={start}
            onChange={(e) => {
              setStart(e.target.value)
              commit(e.target.value, end)
            }}
          />
        </div>
        <div>
          <Label className="mb-1.5" htmlFor="time-range-end">
            End Time
          </Label>
          <Input
            id="time-range-end"
            type="time"
            min={BUSINESS_HOURS_START}
            max={BUSINESS_HOURS_END}
            value={end}
            onChange={(e) => {
              setEnd(e.target.value)
              commit(start, e.target.value)
            }}
          />
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
