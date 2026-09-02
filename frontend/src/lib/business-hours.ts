import type { BookedRange } from "@/types"

export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

export function toHHmm(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

// Half-open-interval overlap ([start,end)) — matches the DB's tsrange
// EXCLUDE constraint exactly, so touching-not-overlapping ranges (one
// ending exactly when another starts) are correctly treated as free.
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && aEnd > bStart
}

export function findConflict(bookedRanges: BookedRange[], start: string, end: string) {
  return bookedRanges.find((r) => rangesOverlap(start, end, r.start, r.end))
}

function todayInputValue() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function nowMinutes() {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

// A time is unbookable once it's already passed — used to block past
// start times in every booking/reschedule/reassign time input.
export function isSlotInPast(date: string, slot: { start: string }) {
  const today = todayInputValue()
  if (date < today) return true
  if (date > today) return false
  return toMinutes(slot.start) <= nowMinutes()
}

// The time a fresh time-range picker should open with. A fixed "09:00" only
// makes sense for a future date — for TODAY, by the time someone opens the
// picker in the afternoon, 09:00 is already hours in the past and they'd
// hit "This time has already passed" before touching anything. Rounds up
// to the next stepMinutes increment (matching TimeSelect's own 5-minute
// steps) so the suggested time is always genuinely still bookable.
export function suggestedStartTime(date: string, stepMinutes = 5): string {
  if (date !== todayInputValue()) return "09:00"
  const rounded = Math.ceil((nowMinutes() + 1) / stepMinutes) * stepMinutes
  return toHHmm(Math.min(rounded, 23 * 60 + 55))
}
