import type { Meeting, MeetingBucket, MeetingType } from "@/types"
import { toMinutes } from "./business-hours"
import { CHART_TONES, type BadgeTone } from "@/components/shared/StatusBadge"

// Assigns each department a stable color from the shared categorical
// palette, by its alphabetical position in the full department list — same
// department always gets the same tone across the Departments page, the
// Reports department chart, and the admin Calendar's department filter,
// rather than each page picking colors independently.
export function departmentTone(allDepartments: string[], department: string): BadgeTone {
  const idx = allDepartments.indexOf(department)
  return CHART_TONES[(idx < 0 ? 0 : idx) % CHART_TONES.length]
}

export const MEETING_TYPE_OPTIONS: { value: MeetingType; label: string }[] = [
  { value: "TACTICAL", label: "Tactical" },
  { value: "STRATEGY", label: "Strategy" },
  { value: "INTERNAL", label: "Internal" },
  { value: "OTHER", label: "Others" },
]

export function meetingTypeLabel(type: MeetingType): string {
  return MEETING_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type
}

export function typeDeptLabel(type: MeetingType, department?: string | null): string {
  const typeLabel = meetingTypeLabel(type)
  return department ? `${typeLabel} · ${department}` : typeLabel
}

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
): "CONFIRMED" | "RESCHEDULED" | "CANCELLED" | "COMPLETED" | "PENDING_APPROVAL" {
  if (m.status === "CANCELLED") return "CANCELLED"
  // Checked before COMPLETED/RESCHEDULED: a pending request always wins,
  // since it means the live row doesn't yet reflect an admin-blessed state
  // (e.g. a pending reschedule already holds its new, possibly-past-looking
  // date/time — it should never briefly read "Completed" before approval).
  if (m.approvalStatus === "PENDING") return "PENDING_APPROVAL"
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
