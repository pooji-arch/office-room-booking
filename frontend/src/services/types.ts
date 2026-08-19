import type {
  AuthUser,
  Booking,
  BookingBucket,
  BookingStatus,
  LoginResult,
  PaginatedResult,
  Role,
  Room,
  RoomAvailability,
  RoomStatus,
  User,
  UserStatus,
} from "@/types"

export interface ListParams {
  page?: number
  pageSize?: number
  search?: string
}

// ---- Auth ----
export interface AuthService {
  login(email: string, password: string): Promise<LoginResult>
  logout(): Promise<void>
  me(): Promise<AuthUser>
  changePassword(input: { currentPassword: string; newPassword: string }): Promise<void>
}

// ---- Rooms ----
export interface ListRoomsParams extends ListParams {
  status?: RoomStatus
  location?: string
}

export interface RoomInput {
  name: string
  capacity: number
  location: string
  description?: string
  status: RoomStatus
  imagePath?: string | null
}

export interface RoomsService {
  listRooms(params?: ListRoomsParams): Promise<PaginatedResult<Room>>
  getRoom(id: string): Promise<Room>
  createRoom(input: RoomInput): Promise<Room>
  updateRoom(id: string, input: Partial<RoomInput>): Promise<Room>
  deleteRoom(id: string): Promise<Room>
  listRoomLocations(): Promise<string[]>
  getRoomAvailability(id: string, date: string): Promise<RoomAvailability>
}

// ---- Bookings ----
export interface ListBookingsParams extends ListParams {
  roomId?: string
  bookedById?: string
  status?: BookingStatus
  bucket?: BookingBucket
  dateFrom?: string
  dateTo?: string
}

export interface CreateBookingInput {
  roomId: string
  date: string
  startTime: string
  endTime: string
  bookedById: string
  purpose: string
  attendees: number
}

export interface ReassignBookingInput {
  roomId?: string
  date?: string
  startTime?: string
  endTime?: string
  bookedById?: string
  reason: string
}

export interface RescheduleBookingInput {
  date: string
  startTime: string
  endTime: string
}

export interface BookingsService {
  listBookings(params?: ListBookingsParams): Promise<PaginatedResult<Booking>>
  getBooking(id: string): Promise<Booking>
  createBooking(input: CreateBookingInput): Promise<Booking>
  updateBooking(
    id: string,
    input: { purpose?: string; attendees?: number }
  ): Promise<Booking>
  reassignBooking(id: string, input: ReassignBookingInput): Promise<Booking>
  rescheduleBooking(id: string, input: RescheduleBookingInput): Promise<Booking>
  cancelBooking(id: string, reason?: string): Promise<Booking>
}

// ---- Users ----
export interface ListUsersParams extends ListParams {
  role?: Role
  status?: UserStatus
}

export interface UserInput {
  name: string
  email: string
  role: Role
  status: UserStatus
  employeeId?: string
  department?: string
  phone?: string
  tempPassword?: string
}

export interface UsersService {
  listUsers(params?: ListUsersParams): Promise<PaginatedResult<User>>
  getUser(id: string): Promise<User>
  createUser(
    input: UserInput
  ): Promise<{ user: User; temporaryPassword?: string }>
  updateUser(id: string, input: Partial<UserInput>): Promise<User>
  deactivateUser(id: string): Promise<User>
  resetPassword(id: string): Promise<{ temporaryPassword: string }>
}
