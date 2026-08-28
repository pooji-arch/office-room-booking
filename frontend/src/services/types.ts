import type {
  ActionItem,
  ActionItemPriority,
  ActionItemStatus,
  ActionItemStatusHistoryEntry,
  ActionItemWithMeeting,
  AgendaItem,
  AuthUser,
  Meeting,
  MeetingBucket,
  MeetingHistoryEntry,
  MeetingParticipant,
  MeetingStatus,
  MeetingType,
  Minutes,
  MinutesItem,
  MinutesRevisionEntry,
  Notification,
  ParticipantRole,
  RsvpStatus,
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
  loginWithGoogle(redirectTo: string): Promise<void>
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
  getRoomAvailability(id: string, date: string, excludeBookingId?: string): Promise<RoomAvailability>
}

// ---- Meetings ----
export interface ListMeetingsParams extends ListParams {
  roomId?: string
  bookedById?: string
  organizerOrParticipantId?: string
  previousMeetingId?: string
  status?: MeetingStatus
  bucket?: MeetingBucket
  dateFrom?: string
  dateTo?: string
}

export interface CreateMeetingInput {
  roomId: string
  date: string
  startTime: string
  endTime: string
  bookedById: string
  purpose: string
  department?: string
  type?: MeetingType
  previousMeetingId?: string
}

export interface ReassignMeetingInput {
  roomId?: string
  date?: string
  startTime?: string
  endTime?: string
  bookedById?: string
  reason: string
}

export interface RescheduleMeetingInput {
  date: string
  startTime: string
  endTime: string
}

export interface AddParticipantInput {
  profileId: string
  role?: ParticipantRole
}

export interface AddAgendaItemInput {
  topic: string
  ownerId?: string
  allottedMinutes?: number
}

export interface AddMinutesItemInput {
  topic: string
  notes: string
  decision?: string
  agendaItemId?: string
}

export interface AddActionItemInput {
  title: string
  description?: string
  ownerId?: string
  dueDate?: string
  minutesItemId?: string
  priority?: ActionItemPriority
}

export interface UpdateActionItemInput {
  title?: string
  description?: string
  ownerId?: string
  dueDate?: string
  priority?: ActionItemPriority
}

export interface EditFinalizedMinutesItemInput {
  topic: string
  notes: string
  decision?: string
  reason: string
}

export interface MeetingsService {
  listMeetings(params?: ListMeetingsParams): Promise<PaginatedResult<Meeting>>
  getMeeting(id: string): Promise<Meeting>
  createMeeting(input: CreateMeetingInput): Promise<Meeting>
  updateMeeting(
    id: string,
    input: { purpose?: string; department?: string; type?: MeetingType; reviewDate?: string }
  ): Promise<Meeting>
  reassignMeeting(id: string, input: ReassignMeetingInput): Promise<Meeting>
  rescheduleMeeting(id: string, input: RescheduleMeetingInput): Promise<Meeting>
  cancelMeeting(id: string, reason?: string): Promise<Meeting>
  getMeetingHistory(meetingId: string): Promise<MeetingHistoryEntry[]>
  listParticipants(meetingId: string): Promise<MeetingParticipant[]>
  addParticipant(meetingId: string, input: AddParticipantInput): Promise<MeetingParticipant>
  updateParticipantRsvp(meetingId: string, participantId: string, rsvpStatus: RsvpStatus): Promise<MeetingParticipant>
  removeParticipant(meetingId: string, participantId: string): Promise<void>
  resendParticipantInvite(meetingId: string, participantId: string): Promise<void>
  listAgendaItems(meetingId: string): Promise<AgendaItem[]>
  addAgendaItem(meetingId: string, input: AddAgendaItemInput): Promise<AgendaItem>
  getMinutes(meetingId: string): Promise<Minutes | null>
  listMinutesItems(meetingId: string): Promise<MinutesItem[]>
  addMinutesItem(meetingId: string, input: AddMinutesItemInput): Promise<MinutesItem>
  finalizeMinutes(meetingId: string): Promise<Minutes>
  editFinalizedMinutesItem(itemId: string, input: EditFinalizedMinutesItemInput): Promise<MinutesItem>
  listActionItems(meetingId: string): Promise<ActionItem[]>
  addActionItem(meetingId: string, input: AddActionItemInput): Promise<ActionItem>
  updateActionItem(meetingId: string, actionItemId: string, input: UpdateActionItemInput): Promise<ActionItem>
  updateActionItemStatus(meetingId: string, actionItemId: string, status: ActionItemStatus): Promise<ActionItem>
  deleteActionItem(meetingId: string, actionItemId: string): Promise<void>
  listAllActionItems(params?: { ownerId?: string }): Promise<ActionItemWithMeeting[]>
  listActionItemStatusHistory(params?: { limit?: number }): Promise<ActionItemStatusHistoryEntry[]>
  listMinutesRevisions(params?: { limit?: number }): Promise<MinutesRevisionEntry[]>
}

// ---- Notifications ----
export interface ListNotificationsParams extends ListParams {
  unreadOnly?: boolean
}

export interface NotificationsService {
  listNotifications(params?: ListNotificationsParams): Promise<PaginatedResult<Notification>>
  markRead(id: string): Promise<Notification>
  markAllRead(): Promise<void>
  getUnreadCount(): Promise<number>
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
