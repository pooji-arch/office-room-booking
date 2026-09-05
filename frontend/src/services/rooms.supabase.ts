import { supabase } from "./supabaseClient"
import type { Room, RoomAvailability } from "@/types"
import type { ListRoomsParams, RoomInput, RoomsService } from "./types"
import { dedupeCaseInsensitive } from "@/lib/utils"

const BUCKET = "room-images"

interface RoomRow {
  id: string
  name: string
  capacity: number
  location: string
  description: string | null
  status: Room["status"]
  image_path: string | null
  deleted_at: string | null
  created_at: string
}

function mapRoom(row: RoomRow): Room {
  return {
    id: row.id,
    name: row.name,
    capacity: row.capacity,
    location: row.location,
    description: row.description ?? undefined,
    status: row.status,
    imageUrl: row.image_path
      ? supabase.storage.from(BUCKET).getPublicUrl(row.image_path).data.publicUrl
      : null,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
  }
}

function toRow(input: Partial<RoomInput>) {
  const row: Record<string, unknown> = {}
  if (input.name !== undefined) row.name = input.name
  if (input.capacity !== undefined) row.capacity = input.capacity
  if (input.location !== undefined) row.location = input.location
  if (input.description !== undefined) row.description = input.description || null
  if (input.status !== undefined) row.status = input.status
  if (input.imagePath !== undefined) row.image_path = input.imagePath
  return row
}

export const supabaseRoomsService: RoomsService = {
  async listRooms(params: ListRoomsParams = {}) {
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 8

    let query = supabase.from("rooms").select("*", { count: "exact" }).is("deleted_at", null)
    if (params.status) query = query.eq("status", params.status)
    if (params.location) query = query.eq("location", params.location)
    if (params.search?.trim()) {
      const q = params.search.trim().replace(/[%_]/g, "")
      query = query.or(`name.ilike.%${q}%,location.ilike.%${q}%`)
    }
    query = query.order("name", { ascending: true }).range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    const total = count ?? 0
    return {
      data: (data as RoomRow[] | null ?? []).map(mapRoom),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    }
  },

  async getRoom(id) {
    const { data, error } = await supabase.from("rooms").select("*").eq("id", id).single()
    if (error || !data) throw new Error("Room not found.")
    return mapRoom(data as RoomRow)
  },

  async createRoom(input) {
    const { data, error } = await supabase.from("rooms").insert(toRow(input)).select("*").single()
    if (error) throw new Error(error.message)
    return mapRoom(data as RoomRow)
  },

  async updateRoom(id, input) {
    const { data, error } = await supabase
      .from("rooms")
      .update(toRow(input))
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw new Error(error.message)
    return mapRoom(data as RoomRow)
  },

  async deleteRoom(id) {
    const { data, error } = await supabase
      .from("rooms")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw new Error(error.message)
    return mapRoom(data as RoomRow)
  },

  async listRoomLocations() {
    const { data, error } = await supabase.from("rooms").select("location").is("deleted_at", null)
    if (error) throw new Error(error.message)
    return dedupeCaseInsensitive((data ?? []).map((r) => r.location as string))
  },

  async getRoomAvailability(id, date, excludeBookingId) {
    const { data: roomRow } = await supabase.from("rooms").select("*").eq("id", id).maybeSingle()
    const room = roomRow ? mapRoom(roomRow as RoomRow) : null
    const roomBookable = !!room && !room.deletedAt && room.status === "AVAILABLE"

    let meetingsQuery = supabase
      .from("meetings")
      .select("id, start_time, end_time")
      .eq("room_id", id)
      .eq("date", date)
      .neq("status", "CANCELLED")
    if (excludeBookingId) meetingsQuery = meetingsQuery.neq("id", excludeBookingId)
    const { data: bookings, error } = await meetingsQuery
    if (error) throw new Error(error.message)

    const result: RoomAvailability = {
      date,
      roomId: id,
      roomBookable,
      bookedRanges: (bookings ?? []).map((b) => ({
        start: (b.start_time as string).slice(0, 5),
        end: (b.end_time as string).slice(0, 5),
      })),
    }
    return result
  },
}

export async function uploadRoomImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg"
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new Error(error.message)
  return path
}

export async function deleteRoomImage(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path])
}
