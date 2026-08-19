export type Role = "ADMIN" | "USER"
export type UserStatus = "ACTIVE" | "INACTIVE"
export type RoomStatus = "AVAILABLE" | "MAINTENANCE" | "UNAVAILABLE"
export type BookingStatus = "CONFIRMED" | "PENDING" | "CANCELLED"

export type BookingBucket =
  | "all"
  | "upcoming"
  | "today"
  | "past"
  | "completed"
  | "cancelled"

export interface User {
  id: string
  name: string
  email: string
  role: Role
  status: UserStatus
  employeeId?: string
  department?: string
  phone?: string
  mustChangePassword: boolean
  createdAt: string
}

export interface Room {
  id: string
  name: string
  capacity: number
  location: string
  description?: string
  status: RoomStatus
  imageUrl?: string | null
  deletedAt?: string | null
  createdAt: string
}

export interface BookingParticipant {
  id: string
  name: string
  email: string
  phone?: string
}

export interface Booking {
  id: string
  code: string
  roomId: string
  roomName: string
  roomLocation: string
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  endTime: string // HH:mm
  bookedBy: BookingParticipant
  purpose: string
  attendees: number
  status: BookingStatus
  cancelledAt?: string
  cancellationReason?: string
  reassignedAt?: string
  reassignedByName?: string
  reassignmentReason?: string
  createdAt: string
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: PaginationMeta
}

export interface SlotAvailability {
  start: string
  end: string
  available: boolean
  bookingId?: string
}

export interface RoomAvailability {
  date: string
  roomId: string
  roomBookable: boolean
  businessHours: { start: string; end: string }
  slotDurationMinutes: number
  slots: SlotAvailability[]
}

export interface AuthUser extends User {}

export interface LoginResult {
  token: string
  user: AuthUser
}
