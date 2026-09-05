import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { TimeSelect } from "@/components/shared/TimeSelect"
import { findConflict, isSlotInPast, suggestedStartTime, toHHmm, toMinutes } from "@/lib/business-hours"
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
  // Real values, not blank — TimeSelect is Select-based and has no clean
  // "empty" affordance the way a native time input does, so this always
  // starts from a sensible real time (adjustable from there) rather than
  // an unset state. When booking fresh (no defaults supplied) for today,
  // that starting point is "now, rounded up" rather than a fixed 09:00 —
  // otherwise opening the picker any time after 9am on the current day
  // would suggest a start time that's already passed.
  const [start, setStart] = useState(() => defaultStart ?? suggestedStartTime(date))
  const [end, setEnd] = useState(() => defaultEnd ?? toHHmm(toMinutes(defaultStart ?? suggestedStartTime(date)) + 30))

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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5" htmlFor="time-range-start">
            Start Time
          </Label>
          <TimeSelect
            id="time-range-start"
            value={start}
            onChange={(v) => {
              setStart(v)
              commit(v, end)
            }}
          />
        </div>
        <div>
          <Label className="mb-1.5" htmlFor="time-range-end">
            End Time
          </Label>
          <TimeSelect
            id="time-range-end"
            value={end}
            onChange={(v) => {
              setEnd(v)
              commit(start, v)
            }}
          />
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
