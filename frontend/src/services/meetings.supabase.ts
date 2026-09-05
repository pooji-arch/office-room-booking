import { supabase } from "./supabaseClient"
import type {
  ActionItem,
  ActionItemStatusHistoryEntry,
  ActionItemWithMeeting,
  AgendaItem,
  Meeting,
  MeetingHistoryEntry,
  MeetingParticipant,
  Minutes,
  MinutesItem,
  MinutesRevisionEntry,
} from "@/types"
import type {
  AddActionItemInput,
  AddAgendaItemInput,
  AddMinutesItemInput,
  AddParticipantInput,
  CreateMeetingInput,
  EditFinalizedMinutesItemInput,
  ListMeetingsParams,
  MeetingsService,
  ReassignMeetingInput,
  RescheduleMeetingInput,
  UpdateActionItemInput,
  UpdateAgendaItemInput,
} from "./types"

interface MeetingRow {
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
  title: string | null
  type: Meeting["type"]
  department: string | null
  review_date: string | null
  previous_meeting_id: string | null
  follow_up_number: number
  attendees: number | null
  status: Meeting["status"]
  approval_status: Meeting["approvalStatus"]
  pending_action: Meeting["pendingAction"] | null
  pending_previous_date: string | null
  pending_previous_start_time: string | null
  pending_previous_end_time: string | null
  pending_requested_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  declined: boolean
  reschedule_declined: boolean
  reassigned_at: string | null
  reassigned_by_name: string | null
  reassignment_reason: string | null
  rescheduled_at: string | null
  organizer_transferred_at: string | null
  previous_organizer_name: string | null
  created_at: string
}

function mapMeeting(row: MeetingRow): Meeting {
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
    title: row.title ?? undefined,
    type: row.type,
    department: row.department ?? undefined,
    reviewDate: row.review_date ?? undefined,
    previousMeetingId: row.previous_meeting_id ?? undefined,
    followUpNumber: row.follow_up_number,
    attendees: row.attendees ?? undefined,
    status: row.status,
    approvalStatus: row.approval_status,
    pendingAction: row.pending_action ?? undefined,
    pendingPreviousDate: row.pending_previous_date ?? undefined,
    pendingPreviousStartTime: row.pending_previous_start_time?.slice(0, 5) ?? undefined,
    pendingPreviousEndTime: row.pending_previous_end_time?.slice(0, 5) ?? undefined,
    pendingRequestedAt: row.pending_requested_at ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    cancellationReason: row.cancellation_reason ?? undefined,
    declined: row.declined,
    rescheduleDeclined: row.reschedule_declined,
    reassignedAt: row.reassigned_at ?? undefined,
    reassignedByName: row.reassigned_by_name ?? undefined,
    reassignmentReason: row.reassignment_reason ?? undefined,
    rescheduledAt: row.rescheduled_at ?? undefined,
    organizerTransferredAt: row.organizer_transferred_at ?? undefined,
    previousOrganizerName: row.previous_organizer_name ?? undefined,
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
function applyBucketFilter(query: any, bucket: ListMeetingsParams["bucket"]) {
  const today = todayStr()
  const now = nowTimeStr()
  switch (bucket) {
    case "upcoming":
      return query
        .or(`date.gt.${today},and(date.eq.${today},start_time.gt.${now})`)
        .neq("status", "CANCELLED")
    case "completed":
      return query
        .or(`date.lt.${today},and(date.eq.${today},end_time.lte.${now})`)
        .neq("status", "CANCELLED")
    case "followup":
      return query.not("previous_meeting_id", "is", null)
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
    return new Error("You can't book or move a meeting into the past.")
  }
  if (error.code === "P0012") {
    return new Error("Meetings must be within business hours (09:00-18:00).")
  }
  if (error.code === "P0013") {
    return new Error("End time must be after start time.")
  }
  if (error.code === "23505") {
    return new Error("This person is already added to this meeting.")
  }
  if (error.code === "P0014") {
    return new Error("Only the meeting organizer or an admin can edit action item details.")
  }
  return new Error(error.message)
}

interface MeetingHistoryRow {
  id: string
  meeting_id: string
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

function mapMeetingHistory(row: MeetingHistoryRow): MeetingHistoryEntry {
  return {
    id: row.id,
    meetingId: row.meeting_id,
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

interface MeetingParticipantRow {
  id: string
  meeting_id: string
  profile_id: string | null
  external_name: string | null
  external_email: string | null
  external_organization: string | null
  role: MeetingParticipant["role"]
  rsvp_status: MeetingParticipant["rsvpStatus"]
  created_at: string
  profile: { name: string; email: string } | null
}

function mapParticipant(row: MeetingParticipantRow): MeetingParticipant {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    profileId: row.profile_id ?? undefined,
    externalName: row.external_name ?? undefined,
    externalEmail: row.external_email ?? undefined,
    externalOrganization: row.external_organization ?? undefined,
    name: row.profile?.name ?? row.external_name ?? "Unknown",
    email: row.profile?.email ?? row.external_email ?? undefined,
    role: row.role,
    rsvpStatus: row.rsvp_status,
    createdAt: row.created_at,
  }
}

interface AgendaItemRow {
  id: string
  meeting_id: string
  topic: string
  owner_id: string | null
  owner_name: string | null
  allotted_minutes: number
  sort_order: number
  created_at: string
  owner: { name: string } | null
}

function mapAgendaItem(row: AgendaItemRow): AgendaItem {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    topic: row.topic,
    ownerId: row.owner_id ?? undefined,
    ownerName: row.owner?.name ?? row.owner_name ?? undefined,
    allottedMinutes: row.allotted_minutes,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }
}

interface MinutesRow {
  id: string
  meeting_id: string
  status: Minutes["status"]
  finalized_by: string | null
  finalized_at: string | null
  created_at: string
  finalizedByProfile: { name: string } | null
}

function mapMinutes(row: MinutesRow): Minutes {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    status: row.status,
    finalizedBy:
      row.finalized_by && row.finalizedByProfile
        ? { id: row.finalized_by, name: row.finalizedByProfile.name }
        : undefined,
    finalizedAt: row.finalized_at ?? undefined,
    createdAt: row.created_at,
  }
}

interface MinutesItemRow {
  id: string
  minutes_id: string
  topic: string
  notes: string
  decision: string | null
  agenda_item_id: string | null
  sort_order: number
  created_at: string
}

function mapMinutesItem(row: MinutesItemRow): MinutesItem {
  return {
    id: row.id,
    minutesId: row.minutes_id,
    topic: row.topic,
    notes: row.notes,
    decision: row.decision ?? undefined,
    agendaItemId: row.agenda_item_id ?? undefined,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }
}

interface ActionItemRow {
  id: string
  meeting_id: string
  minutes_item_id: string | null
  title: string
  description: string | null
  owner_id: string | null
  owner_name: string | null
  due_date: string | null
  status: ActionItem["status"]
  priority: ActionItem["priority"]
  completed_at: string | null
  created_at: string
  owner: { name: string } | null
}

function mapActionItem(row: ActionItemRow): ActionItem {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    minutesItemId: row.minutes_item_id ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    ownerId: row.owner_id ?? undefined,
    ownerName: row.owner?.name ?? row.owner_name ?? undefined,
    dueDate: row.due_date ?? undefined,
    status: row.status,
    priority: row.priority,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
  }
}

interface ActionItemWithMeetingRow extends ActionItemRow {
  meeting: { title: string | null; purpose: string; date: string; department: string | null } | null
}

function mapActionItemWithMeeting(row: ActionItemWithMeetingRow): ActionItemWithMeeting {
  return {
    ...mapActionItem(row),
    meetingTitle: row.meeting?.title ?? row.meeting?.purpose ?? "Meeting",
    meetingDate: row.meeting?.date ?? "",
    meetingDepartment: row.meeting?.department ?? undefined,
  }
}

interface ActionItemStatusHistoryRow {
  id: string
  action_item_id: string
  meeting_id: string
  changed_by_name: string | null
  previous_status: ActionItem["status"]
  new_status: ActionItem["status"]
  changed_at: string
  action_item: { title: string } | null
  meeting: { title: string | null; purpose: string } | null
}

function mapActionItemStatusHistory(row: ActionItemStatusHistoryRow): ActionItemStatusHistoryEntry {
  return {
    id: row.id,
    actionItemId: row.action_item_id,
    actionItemTitle: row.action_item?.title ?? "Action item",
    meetingId: row.meeting_id,
    meetingTitle: row.meeting?.title ?? row.meeting?.purpose ?? "Meeting",
    changedByName: row.changed_by_name ?? undefined,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    changedAt: row.changed_at,
  }
}

interface MinutesRevisionRow {
  id: string
  minutes_id: string
  reason: string
  change_summary: string | null
  changed_at: string
  author: { name: string } | null
  minutes: { meeting_id: string; meeting: { title: string | null; purpose: string } | null } | null
}

function mapMinutesRevision(row: MinutesRevisionRow): MinutesRevisionEntry {
  return {
    id: row.id,
    minutesId: row.minutes_id,
    meetingId: row.minutes?.meeting_id ?? "",
    meetingTitle: row.minutes?.meeting?.title ?? row.minutes?.meeting?.purpose ?? "Meeting",
    authorName: row.author?.name ?? undefined,
    reason: row.reason,
    changeSummary: row.change_summary ?? undefined,
    changedAt: row.changed_at,
  }
}

async function getOrCreateMinutes(meetingId: string): Promise<MinutesRow> {
  const { data: existing, error: selectError } = await supabase
    .from("minutes")
    .select("*, finalizedByProfile:profiles!minutes_finalized_by_fkey(name)")
    .eq("meeting_id", meetingId)
    .maybeSingle()
  if (selectError) throw friendlyError(selectError)
  if (existing) return existing as unknown as MinutesRow

  const { data: created, error: insertError } = await supabase
    .from("minutes")
    .insert({ meeting_id: meetingId })
    .select("*, finalizedByProfile:profiles!minutes_finalized_by_fkey(name)")
    .single()
  if (insertError) throw friendlyError(insertError)
  return created as unknown as MinutesRow
}

export const supabaseMeetingsService: MeetingsService = {
  async listMeetings(params: ListMeetingsParams = {}) {
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 10

    let query = supabase.from("meetings").select("*", { count: "exact" })
    if (params.roomId) query = query.eq("room_id", params.roomId)
    if (params.bookedById) query = query.eq("booked_by_id", params.bookedById)
    if (params.organizerOrParticipantId) {
      const { data: rows } = await supabase
        .from("meeting_participants")
        .select("meeting_id")
        .eq("profile_id", params.organizerOrParticipantId)
      const ids = (rows ?? []).map((r) => r.meeting_id as string)
      const idsClause = ids.length ? `,id.in.(${ids.join(",")})` : ""
      query = query.or(`booked_by_id.eq.${params.organizerOrParticipantId}${idsClause}`)
    }
    if (params.previousMeetingId) query = query.eq("previous_meeting_id", params.previousMeetingId)
    if (params.status) query = query.eq("status", params.status)
    if (params.dateFrom) query = query.gte("date", params.dateFrom)
    if (params.dateTo) query = query.lte("date", params.dateTo)
    if (params.timeFrom) query = query.gte("start_time", params.timeFrom)
    if (params.timeTo) query = query.lte("start_time", params.timeTo)
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
      data: (data as MeetingRow[] | null ?? []).map(mapMeeting),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    }
  },

  async getMeeting(id) {
    const { data, error } = await supabase.from("meetings").select("*").eq("id", id).single()
    if (error || !data) throw new Error("Meeting not found.")
    return mapMeeting(data as MeetingRow)
  },

  async createMeeting(input: CreateMeetingInput) {
    const { data, error } = await supabase
      .from("meetings")
      .insert({
        room_id: input.roomId,
        date: input.date,
        start_time: input.startTime,
        end_time: input.endTime,
        booked_by_id: input.bookedById,
        purpose: input.purpose,
        title: input.purpose,
        department: input.department || null,
        type: input.type ?? "INTERNAL",
        previous_meeting_id: input.previousMeetingId || null,
      })
      .select("*")
      .single()
    if (error) throw friendlyError(error)
    return mapMeeting(data as MeetingRow)
  },

  async updateMeeting(id, input) {
    const { data, error } = await supabase
      .from("meetings")
      .update({
        ...(input.purpose !== undefined && { purpose: input.purpose }),
        ...(input.department !== undefined && { department: input.department }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.reviewDate !== undefined && { review_date: input.reviewDate }),
      })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw friendlyError(error)
    return mapMeeting(data as MeetingRow)
  },

  async reassignMeeting(id, input: ReassignMeetingInput) {
    let reassignedByName: string | undefined
    if (input.organizerChanged) {
      const { data: currentUser } = await supabase.auth.getUser()
      if (currentUser.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", currentUser.user.id)
          .single()
        reassignedByName = profile?.name
      }
    }

    const { data, error } = await supabase
      .from("meetings")
      .update({
        ...(input.roomId !== undefined && { room_id: input.roomId }),
        ...(input.date !== undefined && { date: input.date }),
        ...(input.startTime !== undefined && { start_time: input.startTime }),
        ...(input.endTime !== undefined && { end_time: input.endTime }),
        ...(input.bookedById !== undefined && { booked_by_id: input.bookedById }),
        // Stamped independently — reassigning the organizer without touching
        // the schedule shouldn't show a "Rescheduled" banner, and changing
        // just the room/time without the organizer shouldn't show
        // "Reassigned by <admin>". Both can fire together when both actually
        // changed.
        ...(input.organizerChanged && {
          reassigned_at: new Date().toISOString(),
          reassigned_by_name: reassignedByName,
          reassignment_reason: input.reason,
        }),
        ...(input.timeChanged && { rescheduled_at: new Date().toISOString() }),
      })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw friendlyError(error)
    return mapMeeting(data as MeetingRow)
  },

  async transferOrganizer(id, newOrganizerId: string) {
    // Deliberately just booked_by_id + organizer_transferred_at — no
    // reassigned_at/reassigned_by_name/reassignment_reason (those stay
    // admin-reassignment-only, per migration 0023) and no rescheduled_at
    // (nothing about the schedule changed). booked_by_name/email/phone
    // aren't set here either; they're auto-synced from the new organizer's
    // profile by the DB's own set_booking_snapshots trigger.
    // organizer_transferred_at (migration 0025) is this transfer's own
    // timestamp, driving both the "Transferred" badge and the new
    // organizer's notification.
    const { data, error } = await supabase
      .from("meetings")
      .update({ booked_by_id: newOrganizerId, organizer_transferred_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw friendlyError(error)
    return mapMeeting(data as MeetingRow)
  },

  async rescheduleMeeting(id, input: RescheduleMeetingInput) {
    // rescheduled_at (migration 0017), not reassigned_at — reassigned_at is
    // protected by a column-guard trigger that only an admin can write to
    // (confirmed live: a plain organizer's self-service reschedule got
    // rejected outright the moment it touched that column, even on their
    // own meeting). rescheduled_at is a separate, unprotected column that
    // exists purely so meetingDisplayStatus() has something to key off for
    // ANY reschedule, not just an admin's.
    const { data, error } = await supabase
      .from("meetings")
      .update({
        date: input.date,
        start_time: input.startTime,
        end_time: input.endTime,
        rescheduled_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw friendlyError(error)
    return mapMeeting(data as MeetingRow)
  },

  async cancelMeeting(id, reason) {
    const { data, error } = await supabase
      .from("meetings")
      .update({
        status: "CANCELLED",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
      })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw friendlyError(error)
    return mapMeeting(data as MeetingRow)
  },

  async resolveMeetingApproval(id, approve, note) {
    // The DB does all the branching (what "approve"/"reject" actually
    // applies differs by pending_action) — this just calls it.
    const { data, error } = await supabase.rpc("resolve_meeting_approval", {
      p_meeting_id: id,
      p_approve: approve,
      p_note: note ?? null,
    })
    if (error) throw friendlyError(error)
    return mapMeeting(data as MeetingRow)
  },

  async getMeetingHistory(meetingId) {
    const { data, error } = await supabase
      .from("meeting_history")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("changed_at", { ascending: false })
    if (error) throw friendlyError(error)
    return (data as MeetingHistoryRow[] | null ?? []).map(mapMeetingHistory)
  },

  async listParticipants(meetingId) {
    const { data, error } = await supabase
      .from("meeting_participants")
      .select("*, profile:profiles(name,email)")
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: true })
    if (error) throw friendlyError(error)
    return (data as unknown as MeetingParticipantRow[] | null ?? []).map(mapParticipant)
  },

  async addParticipant(meetingId, input: AddParticipantInput) {
    const { data, error } = await supabase
      .from("meeting_participants")
      .insert({
        meeting_id: meetingId,
        profile_id: input.profileId || null,
        external_name: input.externalName || null,
        role: input.role ?? "PARTICIPANT",
      })
      .select("*, profile:profiles(name,email)")
      .single()
    if (error) throw friendlyError(error)
    return mapParticipant(data as unknown as MeetingParticipantRow)
  },

  async updateParticipantRsvp(meetingId, participantId, rsvpStatus) {
    const { data, error } = await supabase
      .from("meeting_participants")
      .update({ rsvp_status: rsvpStatus })
      .eq("id", participantId)
      .eq("meeting_id", meetingId)
      .select("*, profile:profiles(name,email)")
      .single()
    if (error) throw friendlyError(error)
    return mapParticipant(data as unknown as MeetingParticipantRow)
  },

  async removeParticipant(meetingId, participantId) {
    const { error } = await supabase
      .from("meeting_participants")
      .delete()
      .eq("id", participantId)
      .eq("meeting_id", meetingId)
    if (error) throw friendlyError(error)
  },

  async listAgendaItems(meetingId) {
    const { data, error } = await supabase
      .from("agenda_items")
      .select("*, owner:profiles(name)")
      .eq("meeting_id", meetingId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
    if (error) throw friendlyError(error)
    return (data as unknown as AgendaItemRow[] | null ?? []).map(mapAgendaItem)
  },

  async addAgendaItem(meetingId, input: AddAgendaItemInput) {
    const { data, error } = await supabase
      .from("agenda_items")
      .insert({
        meeting_id: meetingId,
        topic: input.topic,
        owner_name: input.ownerName || null,
        allotted_minutes: input.allottedMinutes ?? 10,
      })
      .select("*, owner:profiles(name)")
      .single()
    if (error) throw friendlyError(error)
    return mapAgendaItem(data as unknown as AgendaItemRow)
  },

  async updateAgendaItem(_meetingId, agendaItemId, input: UpdateAgendaItemInput) {
    const { data, error } = await supabase
      .from("agenda_items")
      .update({
        ...(input.topic !== undefined && { topic: input.topic }),
        ...(input.ownerName !== undefined && { owner_name: input.ownerName || null }),
        ...(input.allottedMinutes !== undefined && { allotted_minutes: input.allottedMinutes }),
      })
      .eq("id", agendaItemId)
      .select("*, owner:profiles(name)")
      .single()
    if (error) throw friendlyError(error)
    return mapAgendaItem(data as unknown as AgendaItemRow)
  },

  async getMinutes(meetingId) {
    const { data, error } = await supabase
      .from("minutes")
      .select("*, finalizedByProfile:profiles!minutes_finalized_by_fkey(name)")
      .eq("meeting_id", meetingId)
      .maybeSingle()
    if (error) throw friendlyError(error)
    return data ? mapMinutes(data as unknown as MinutesRow) : null
  },

  async listMinutesItems(meetingId) {
    const { data: minutesRow, error: minutesError } = await supabase
      .from("minutes")
      .select("id")
      .eq("meeting_id", meetingId)
      .maybeSingle()
    if (minutesError) throw friendlyError(minutesError)
    if (!minutesRow) return []

    const { data, error } = await supabase
      .from("minutes_items")
      .select("*")
      .eq("minutes_id", minutesRow.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
    if (error) throw friendlyError(error)
    return (data as MinutesItemRow[] | null ?? []).map(mapMinutesItem)
  },

  async addMinutesItem(meetingId, input: AddMinutesItemInput) {
    const minutesRow = await getOrCreateMinutes(meetingId)
    const { data, error } = await supabase
      .from("minutes_items")
      .insert({
        minutes_id: minutesRow.id,
        topic: input.topic,
        notes: input.notes,
        decision: input.decision || null,
        agenda_item_id: input.agendaItemId || null,
      })
      .select("*")
      .single()
    if (error) throw friendlyError(error)
    const minutesItem = mapMinutesItem(data as MinutesItemRow)

    if (input.decision) {
      const { data: meetingRow } = await supabase
        .from("meetings")
        .select("booked_by_id")
        .eq("id", meetingId)
        .single()
      if (meetingRow) {
        await supabase.from("action_items").insert({
          meeting_id: meetingId,
          minutes_item_id: minutesItem.id,
          title: `Follow up: ${input.decision}`,
          owner_id: meetingRow.booked_by_id,
          status: "OPEN",
          priority: "MEDIUM",
        })
      }
    }

    return minutesItem
  },

  async finalizeMinutes(meetingId) {
    const minutesRow = await getOrCreateMinutes(meetingId)
    const { data: currentUser } = await supabase.auth.getUser()
    if (!currentUser.user) throw new Error("You must be signed in to finalize minutes.")

    const { data, error } = await supabase
      .from("minutes")
      .update({
        status: "FINAL",
        finalized_by: currentUser.user.id,
        finalized_at: new Date().toISOString(),
      })
      .eq("id", minutesRow.id)
      .select("*, finalizedByProfile:profiles!minutes_finalized_by_fkey(name)")
      .single()
    if (error) throw friendlyError(error)
    return mapMinutes(data as unknown as MinutesRow)
  },

  async editFinalizedMinutesItem(itemId, input: EditFinalizedMinutesItemInput) {
    const { data, error } = await supabase.rpc("edit_finalized_minutes_item", {
      p_item_id: itemId,
      p_topic: input.topic,
      p_notes: input.notes,
      p_decision: input.decision || null,
      p_reason: input.reason,
    })
    if (error) throw friendlyError(error)
    return mapMinutesItem(data as unknown as MinutesItemRow)
  },

  async listActionItems(meetingId) {
    const { data, error } = await supabase
      .from("action_items")
      .select("*, owner:profiles(name)")
      .eq("meeting_id", meetingId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
    if (error) throw friendlyError(error)
    return (data as unknown as ActionItemRow[] | null ?? []).map(mapActionItem)
  },

  async addActionItem(meetingId, input: AddActionItemInput) {
    const { data, error } = await supabase
      .from("action_items")
      .insert({
        meeting_id: meetingId,
        minutes_item_id: input.minutesItemId || null,
        title: input.title,
        description: input.description || null,
        owner_name: input.ownerName || null,
        due_date: input.dueDate || null,
        priority: input.priority ?? "MEDIUM",
      })
      .select("*, owner:profiles(name)")
      .single()
    if (error) throw friendlyError(error)
    return mapActionItem(data as unknown as ActionItemRow)
  },

  async updateActionItem(_meetingId, actionItemId, input: UpdateActionItemInput) {
    const { data, error } = await supabase
      .from("action_items")
      .update({
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description || null }),
        ...(input.ownerName !== undefined && { owner_name: input.ownerName || null }),
        ...(input.dueDate !== undefined && { due_date: input.dueDate || null }),
        ...(input.priority !== undefined && { priority: input.priority }),
      })
      .eq("id", actionItemId)
      .select("*, owner:profiles(name)")
      .single()
    if (error) throw friendlyError(error)
    return mapActionItem(data as unknown as ActionItemRow)
  },

  async updateActionItemStatus(_meetingId, actionItemId, status) {
    const { data, error } = await supabase
      .from("action_items")
      .update({ status })
      .eq("id", actionItemId)
      .select("*, owner:profiles(name)")
      .single()
    if (error) throw friendlyError(error)
    return mapActionItem(data as unknown as ActionItemRow)
  },

  async deleteActionItem(_meetingId, actionItemId) {
    const { error } = await supabase.from("action_items").delete().eq("id", actionItemId)
    if (error) throw friendlyError(error)
  },

  async listAllActionItems(params) {
    let query = supabase
      .from("action_items")
      .select("*, owner:profiles(name), meeting:meetings(title, purpose, date, department)")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
    if (params?.ownerId) query = query.eq("owner_id", params.ownerId)
    const { data, error } = await query
    if (error) throw friendlyError(error)
    return (data as unknown as ActionItemWithMeetingRow[] | null ?? []).map(mapActionItemWithMeeting)
  },

  async listActionItemStatusHistory(params) {
    const { data, error } = await supabase
      .from("action_item_status_history")
      .select("*, action_item:action_items(title), meeting:meetings(title, purpose)")
      .order("changed_at", { ascending: false })
      .limit(params?.limit ?? 20)
    if (error) throw friendlyError(error)
    return (data as unknown as ActionItemStatusHistoryRow[] | null ?? []).map(mapActionItemStatusHistory)
  },

  async listMinutesRevisions(params) {
    const { data, error } = await supabase
      .from("minutes_revisions")
      .select("*, author:profiles(name), minutes:minutes(meeting_id, meeting:meetings(title, purpose))")
      .order("changed_at", { ascending: false })
      .limit(params?.limit ?? 20)
    if (error) throw friendlyError(error)
    return (data as unknown as MinutesRevisionRow[] | null ?? []).map(mapMinutesRevision)
  },
}
