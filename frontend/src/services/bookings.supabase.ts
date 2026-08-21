import { supabase } from "./supabaseClient"
import type { Booking, BookingHistoryEntry } from "@/types"
import type {
  BookingsService,
  CreateBookingInput,
  ListBookingsParams,
  ReassignBookingInput,
  RescheduleBookingInput,
} from "./types"

interface BookingRow {
  id: string
  code: string
  room_id: string
  room_name: string
  room_location: string
  date: string
  start_time: string
  end_time: string
  booked_by_id: string
  booked_by_name: string
  booked_by_email: string
  booked_by_phone: string | null
  purpose: string
  attendees: number
  status: Booking["status"]
  cancelled_at: string | null
  cancellation_reason: string | null
  reassigned_at: string | null
  reassigned_by_name: string | null
  reassignment_reason: string | null
  created_at: string
}

function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    code: row.code,
    roomId: row.room_id,
    roomName: row.room_name,
    roomLocation: row.room_location,
    date: row.date,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    bookedBy: {
      id: row.booked_by_id,
      name: row.booked_by_name,
      email: row.booked_by_email,
      phone: row.booked_by_phone ?? undefined,
    },
    purpose: row.purpose,
    attendees: row.attendees,
    status: row.status,
    cancelledAt: row.cancelled_at ?? undefined,
    cancellationReason: row.cancellation_reason ?? undefined,
    reassignedAt: row.reassigned_at ?? undefined,
    reassignedByName: row.reassigned_by_name ?? undefined,
    reassignmentReason: row.reassignment_reason ?? undefined,
    createdAt: row.created_at,
  }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function nowTimeStr() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyBucketFilter(query: any, bucket: ListBookingsParams["bucket"]) {
  const today = todayStr()
  const now = nowTimeStr()
  switch (bucket) {
    case "today":
      return query.eq("date", today).neq("status", "CANCELLED")
    case "upcoming":
      return query
        .or(`date.gt.${today},and(date.eq.${today},start_time.gt.${now})`)
        .neq("status", "CANCELLED")
    case "past":
    case "completed":
      return query
        .or(`date.lt.${today},and(date.eq.${today},end_time.lte.${now})`)
        .neq("status", "CANCELLED")
    case "cancelled":
      return query.eq("status", "CANCELLED")
    case "all":
    default:
      return query
  }
}

function friendlyError(error: { code?: string; message: string }): Error {
  if (error.code === "23P01") {
    return new Error("Room already booked for an overlapping time.")
  }
  if (error.code === "P0011") {
    return new Error("You can't book or move a booking into the past.")
  }
  if (error.code === "P0012") {
    return new Error("Bookings must be within business hours (09:00-18:00).")
  }
  if (error.code === "P0013") {
    return new Error("End time must be after start time.")
  }
  return new Error(error.message)
}

interface BookingHistoryRow {
  id: string
  booking_id: string
  previous_room_name: string
  previous_room_location: string
  previous_date: string
  previous_start_time: string
  previous_end_time: string
  new_room_name: string
  new_room_location: string
  new_date: string
  new_start_time: string
  new_end_time: string
  reason: string | null
  changed_by_is_admin: boolean
  changed_by_name: string
  changed_at: string
}

function mapBookingHistory(row: BookingHistoryRow): BookingHistoryEntry {
  return {
    id: row.id,
    bookingId: row.booking_id,
    previousRoomName: row.previous_room_name,
    previousRoomLocation: row.previous_room_location,
    previousDate: row.previous_date,
    previousStartTime: row.previous_start_time.slice(0, 5),
    previousEndTime: row.previous_end_time.slice(0, 5),
    newRoomName: row.new_room_name,
    newRoomLocation: row.new_room_location,
    newDate: row.new_date,
    newStartTime: row.new_start_time.slice(0, 5),
    newEndTime: row.new_end_time.slice(0, 5),
    reason: row.reason ?? undefined,
    changedByIsAdmin: row.changed_by_is_admin,
    changedByName: row.changed_by_name,
    changedAt: row.changed_at,
  }
}

export const supabaseBookingsService: BookingsService = {
  async listBookings(params: ListBookingsParams = {}) {
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 10

    let query = supabase.from("bookings").select("*", { count: "exact" })
    if (params.roomId) query = query.eq("room_id", params.roomId)
    if (params.bookedById) query = query.eq("booked_by_id", params.bookedById)
    if (params.status) query = query.eq("status", params.status)
    if (params.dateFrom) query = query.gte("date", params.dateFrom)
    if (params.dateTo) query = query.lte("date", params.dateTo)
    if (params.search?.trim()) {
      const q = params.search.trim().replace(/[%_]/g, "")
      query = query.or(
        `code.ilike.%${q}%,purpose.ilike.%${q}%,booked_by_name.ilike.%${q}%,room_name.ilike.%${q}%`
      )
    }
    query = applyBucketFilter(query, params.bucket)
    query = query
      .order("date", { ascending: false })
      .order("start_time", { ascending: true })
      .range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query
    if (error) throw friendlyError(error)

    const total = count ?? 0
    return {
      data: (data as BookingRow[] | null ?? []).map(mapBooking),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    }
  },

  async getBooking(id) {
    const { data, error } = await supabase.from("bookings").select("*").eq("id", id).single()
    if (error || !data) throw new Error("Booking not found.")
    return mapBooking(data as BookingRow)
  },

  async createBooking(input: CreateBookingInput) {
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        room_id: input.roomId,
        date: input.date,
        start_time: input.startTime,
        end_time: input.endTime,
        booked_by_id: input.bookedById,
        purpose: input.purpose,
        attendees: input.attendees,
      })
      .select("*")
      .single()
    if (error) throw friendlyError(error)
    return mapBooking(data as BookingRow)
  },

  async updateBooking(id, input) {
    const { data, error } = await supabase
      .from("bookings")
      .update({
        ...(input.purpose !== undefined && { purpose: input.purpose }),
        ...(input.attendees !== undefined && { attendees: input.attendees }),
      })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw friendlyError(error)
    return mapBooking(data as BookingRow)
  },

  async reassignBooking(id, input: ReassignBookingInput) {
    const { data: currentUser } = await supabase.auth.getUser()
    let reassignedByName: string | undefined
    if (currentUser.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", currentUser.user.id)
        .single()
      reassignedByName = profile?.name
    }

    const { data, error } = await supabase
      .from("bookings")
      .update({
        ...(input.roomId !== undefined && { room_id: input.roomId }),
        ...(input.date !== undefined && { date: input.date }),
        ...(input.startTime !== undefined && { start_time: input.startTime }),
        ...(input.endTime !== undefined && { end_time: input.endTime }),
        ...(input.bookedById !== undefined && { booked_by_id: input.bookedById }),
        reassigned_at: new Date().toISOString(),
        reassigned_by_name: reassignedByName,
        reassignment_reason: input.reason,
      })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw friendlyError(error)
    return mapBooking(data as BookingRow)
  },

  async rescheduleBooking(id, input: RescheduleBookingInput) {
    const { data, error } = await supabase
      .from("bookings")
      .update({ date: input.date, start_time: input.startTime, end_time: input.endTime })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw friendlyError(error)
    return mapBooking(data as BookingRow)
  },

  async cancelBooking(id, reason) {
    const { data, error } = await supabase
      .from("bookings")
      .update({
        status: "CANCELLED",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
      })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw friendlyError(error)
    return mapBooking(data as BookingRow)
  },

  async getBookingHistory(bookingId) {
    const { data, error } = await supabase
      .from("booking_history")
      .select("*")
      .eq("booking_id", bookingId)
      .order("changed_at", { ascending: false })
    if (error) throw friendlyError(error)
    return (data as BookingHistoryRow[] | null ?? []).map(mapBookingHistory)
  },
}
