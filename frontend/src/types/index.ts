export type Role = "ADMIN" | "USER"
export type UserStatus = "ACTIVE" | "INACTIVE"
export type RoomStatus = "AVAILABLE" | "MAINTENANCE" | "UNAVAILABLE"
export type MeetingStatus = "CONFIRMED" | "CANCELLED"
export type MeetingType = "INTERNAL" | "CLIENT" | "REVIEW" | "OTHER"
export type ParticipantRole = "CHAIR" | "PARTICIPANT"
export type RsvpStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "TENTATIVE"

export type MeetingBucket = "all" | "upcoming" | "completed" | "followup"

export type MinutesStatus = "DRAFT" | "FINAL"

export type ActionItemStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "DELAYED"
export type ActionItemPriority = "LOW" | "MEDIUM" | "HIGH"

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

export interface MeetingOrganizer {
  id: string
  name: string
  email: string
  phone?: string
}

export interface MeetingParticipant {
  id: string
  meetingId: string
  profileId?: string
  externalName?: string
  externalEmail?: string
  externalOrganization?: string
  name: string
  email?: string
  role: ParticipantRole
  rsvpStatus: RsvpStatus
  createdAt: string
}

export interface Meeting {
  id: string
  code: string
  roomId: string
  roomName: string
  roomLocation: string
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  endTime: string // HH:mm
  bookedBy: MeetingOrganizer
  purpose: string
  title?: string
  type: MeetingType
  department?: string
  reviewDate?: string
  previousMeetingId?: string
  attendees?: number
  status: MeetingStatus
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

export interface BookedRange {
  start: string
  end: string
}

export interface RoomAvailability {
  date: string
  roomId: string
  roomBookable: boolean
  businessHours: { start: string; end: string }
  bookedRanges: BookedRange[]
}

export interface AgendaItem {
  id: string
  meetingId: string
  topic: string
  ownerId?: string
  ownerName?: string
  allottedMinutes: number
  sortOrder: number
  createdAt: string
}

export interface MinutesItem {
  id: string
  minutesId: string
  topic: string
  notes: string
  decision?: string
  agendaItemId?: string
  sortOrder: number
  createdAt: string
}

export interface Minutes {
  id: string
  meetingId: string
  status: MinutesStatus
  finalizedBy?: { id: string; name: string }
  finalizedAt?: string
  createdAt: string
}

export interface ActionItem {
  id: string
  meetingId: string
  minutesItemId?: string
  title: string
  description?: string
  ownerId?: string
  ownerName?: string
  dueDate?: string
  status: ActionItemStatus
  priority: ActionItemPriority
  completedAt?: string
  createdAt: string
}

export type NotificationType =
  | "PARTICIPANT_ADDED"
  | "ACTION_ITEM_ASSIGNED"
  | "MEETING_CANCELLED"
  | "MEETING_RESCHEDULED"
  | "MINUTES_FINALIZED"
  | "MEETING_REMINDER_24H"
  | "MEETING_REMINDER_1H"
  | "ACTION_ITEM_DUE_SOON"
  | "ACTION_ITEM_OVERDUE_DIGEST"
  | "MOM_PENDING_NUDGE"

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  link?: string
  meetingId?: string
  read: boolean
  createdAt: string
}

export interface ActionItemWithMeeting extends ActionItem {
  meetingTitle: string
  meetingDate: string
  meetingDepartment?: string
}

export interface ActionItemStatusHistoryEntry {
  id: string
  actionItemId: string
  actionItemTitle: string
  meetingId: string
  meetingTitle: string
  changedByName?: string
  previousStatus: ActionItemStatus
  newStatus: ActionItemStatus
  changedAt: string
}

export interface MinutesRevisionEntry {
  id: string
  minutesId: string
  meetingId: string
  meetingTitle: string
  authorName?: string
  reason: string
  changeSummary?: string
  changedAt: string
}

export interface MeetingHistoryEntry {
  id: string
  meetingId: string
  previousRoomName: string
  previousRoomLocation: string
  previousDate: string
  previousStartTime: string
  previousEndTime: string
  newRoomName: string
  newRoomLocation: string
  newDate: string
  newStartTime: string
  newEndTime: string
  reason?: string
  changedByIsAdmin: boolean
  changedByName: string
  changedAt: string
}

export interface AuthUser extends User {}

export interface LoginResult {
  token: string
  user: AuthUser
}
