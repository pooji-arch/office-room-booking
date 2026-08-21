import type { Booking, BookingBucket } from "@/types"
import { toMinutes } from "./business-hours"

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function nowMinutes() {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

export function isToday(b: Booking) {
  return b.date === todayStr() && b.status !== "CANCELLED"
}

export function isUpcoming(b: Booking) {
  if (b.status === "CANCELLED") return false
  const today = todayStr()
  if (b.date > today) return true
  if (b.date === today && toMinutes(b.startTime) > nowMinutes()) return true
  return false
}

export function isPast(b: Booking) {
  if (b.status === "CANCELLED") return false
  const today = todayStr()
  if (b.date < today) return true
  if (b.date === today && toMinutes(b.endTime) <= nowMinutes()) return true
  return false
}

export function isCompleted(b: Booking) {
  return isPast(b) && b.status === "CONFIRMED"
}

export function isHappeningNow(b: Booking) {
  if (b.status === "CANCELLED") return false
  if (b.date !== todayStr()) return false
  const n = nowMinutes()
  return toMinutes(b.startTime) <= n && toMinutes(b.endTime) > n
}

export function matchesBucket(b: Booking, bucket?: BookingBucket) {
  switch (bucket) {
    case "today":
      return isToday(b)
    case "upcoming":
      return isUpcoming(b)
    case "past":
      return isPast(b)
    case "completed":
      return isCompleted(b)
    case "cancelled":
      return b.status === "CANCELLED"
    case "all":
    case undefined:
    default:
      return true
  }
}

// Completed/Cancelled are terminal and always win. Otherwise a booking that
// has ever been rescheduled/reassigned (reassignedAt set) reads as
// "Rescheduled" rather than plain "Confirmed", so it stays identifiable —
// but it's never "Pending" just for not having started yet.
export function bookingDisplayStatus(
  b: Booking
): "CONFIRMED" | "RESCHEDULED" | "CANCELLED" | "COMPLETED" {
  if (b.status === "CANCELLED") return "CANCELLED"
  if (isCompleted(b)) return "COMPLETED"
  if (b.reassignedAt) return "RESCHEDULED"
  return "CONFIRMED"
}
