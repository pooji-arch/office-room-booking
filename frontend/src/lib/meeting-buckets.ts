import type { Meeting, MeetingBucket } from "@/types"
import { toMinutes } from "./business-hours"

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function nowMinutes() {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

export function isToday(m: Meeting) {
  return m.date === todayStr() && m.status !== "CANCELLED"
}

export function isUpcoming(m: Meeting) {
  if (m.status === "CANCELLED") return false
  const today = todayStr()
  if (m.date > today) return true
  if (m.date === today && toMinutes(m.startTime) > nowMinutes()) return true
  return false
}

export function isPast(m: Meeting) {
  if (m.status === "CANCELLED") return false
  const today = todayStr()
  if (m.date < today) return true
  if (m.date === today && toMinutes(m.endTime) <= nowMinutes()) return true
  return false
}

export function isCompleted(m: Meeting) {
  return isPast(m) && m.status === "CONFIRMED"
}

export function isHappeningNow(m: Meeting) {
  if (m.status === "CANCELLED") return false
  if (m.date !== todayStr()) return false
  const n = nowMinutes()
  return toMinutes(m.startTime) <= n && toMinutes(m.endTime) > n
}

export function matchesBucket(m: Meeting, bucket?: MeetingBucket) {
  switch (bucket) {
    case "upcoming":
      return isUpcoming(m)
    case "completed":
      return isCompleted(m)
    case "followup":
      return !!m.previousMeetingId
    case "all":
    case undefined:
    default:
      return true
  }
}

// Completed/Cancelled are terminal and always win. Otherwise a meeting that
// has ever had its schedule changed reads as "Rescheduled" rather than plain
// "Confirmed", so it stays identifiable — but it's never "Pending" just for
// not having started yet.
//
// Checks rescheduledAt, not just reassignedAt: reassignedAt is set only by
// an admin's Edit & Reassign action (it's protected by a DB trigger that
// rejects a bare organizer from ever writing to it, confirmed live), so a
// plain self-service reschedule had no way to ever flip this status before
// rescheduledAt existed — it read "Confirmed" forever despite genuinely
// having reschedule history. rescheduledAt is set by both paths.
export function meetingDisplayStatus(
  m: Meeting
): "CONFIRMED" | "RESCHEDULED" | "CANCELLED" | "COMPLETED" {
  if (m.status === "CANCELLED") return "CANCELLED"
  if (isCompleted(m)) return "COMPLETED"
  if (m.reassignedAt || m.rescheduledAt) return "RESCHEDULED"
  return "CONFIRMED"
}

// followUpNumber is the meeting's own position in its chain (1 = the
// original meeting, 2 = its first follow-up, 3 = a follow-up of that
// follow-up, ...). The badge counts FOLLOW-UPS, not chain position, so the
// first follow-up just reads "Follow-up" and only the second one onward
// gets a number: "Follow-up ×2", "Follow-up ×3".
export function followUpLabel(followUpNumber: number): string | null {
  const hopCount = followUpNumber - 1
  if (hopCount < 1) return null
  return hopCount === 1 ? "Follow-up" : `Follow-up ×${hopCount}`
}
