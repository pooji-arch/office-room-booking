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
// has ever been rescheduled/reassigned (reassignedAt set) reads as
// "Rescheduled" rather than plain "Confirmed", so it stays identifiable —
// but it's never "Pending" just for not having started yet.
export function meetingDisplayStatus(
  m: Meeting
): "CONFIRMED" | "RESCHEDULED" | "CANCELLED" | "COMPLETED" {
  if (m.status === "CANCELLED") return "CANCELLED"
  if (isCompleted(m)) return "COMPLETED"
  if (m.reassignedAt) return "RESCHEDULED"
  return "CONFIRMED"
}
