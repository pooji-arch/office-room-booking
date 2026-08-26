import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { meetingsService } from "@/services/meetings"
import type {
  AddActionItemInput,
  AddAgendaItemInput,
  AddMinutesItemInput,
  AddParticipantInput,
  CreateMeetingInput,
  EditFinalizedMinutesItemInput,
  ListMeetingsParams,
  ReassignMeetingInput,
  RescheduleMeetingInput,
  UpdateActionItemInput,
} from "@/services/types"
import type { ActionItemStatus, RsvpStatus } from "@/types"
import { roomKeys } from "./useRooms"

export const meetingKeys = {
  all: ["meetings"] as const,
  list: (params: ListMeetingsParams) => ["meetings", "list", params] as const,
  detail: (id: string) => ["meetings", "detail", id] as const,
  history: (id: string) => ["meetings", "history", id] as const,
  participants: (id: string) => ["meetings", "participants", id] as const,
  agendaItems: (id: string) => ["meetings", "agendaItems", id] as const,
  minutes: (id: string) => ["meetings", "minutes", id] as const,
  minutesItems: (id: string) => ["meetings", "minutesItems", id] as const,
  actionItems: (id: string) => ["meetings", "actionItems", id] as const,
}

function invalidateMeetingRelated(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: meetingKeys.all })
  qc.invalidateQueries({ queryKey: roomKeys.all })
}

export function useMeetings(params: ListMeetingsParams = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: meetingKeys.list(params),
    queryFn: () => meetingsService.listMeetings(params),
    enabled: options?.enabled ?? true,
  })
}

export function useMeeting(id: string | undefined) {
  return useQuery({
    queryKey: meetingKeys.detail(id ?? ""),
    queryFn: () => meetingsService.getMeeting(id!),
    enabled: !!id,
  })
}

export function useMeetingHistory(id: string | undefined) {
  return useQuery({
    queryKey: meetingKeys.history(id ?? ""),
    queryFn: () => meetingsService.getMeetingHistory(id!),
    enabled: !!id,
  })
}

export function useMeetingParticipants(id: string | undefined) {
  return useQuery({
    queryKey: meetingKeys.participants(id ?? ""),
    queryFn: () => meetingsService.listParticipants(id!),
    enabled: !!id,
  })
}

export function useCreateMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateMeetingInput) => meetingsService.createMeeting(input),
    onSuccess: () => invalidateMeetingRelated(qc),
  })
}

export function useUpdateMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: { purpose?: string; department?: string; type?: CreateMeetingInput["type"]; reviewDate?: string }
    }) => meetingsService.updateMeeting(id, input),
    onSuccess: () => invalidateMeetingRelated(qc),
  })
}

export function useReassignMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReassignMeetingInput }) =>
      meetingsService.reassignMeeting(id, input),
    onSuccess: () => invalidateMeetingRelated(qc),
  })
}

export function useRescheduleMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RescheduleMeetingInput }) =>
      meetingsService.rescheduleMeeting(id, input),
    onSuccess: () => invalidateMeetingRelated(qc),
  })
}

export function useCancelMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      meetingsService.cancelMeeting(id, reason),
    onSuccess: () => invalidateMeetingRelated(qc),
  })
}

export function useAddParticipant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ meetingId, input }: { meetingId: string; input: AddParticipantInput }) =>
      meetingsService.addParticipant(meetingId, input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: meetingKeys.participants(variables.meetingId) })
      qc.invalidateQueries({ queryKey: meetingKeys.detail(variables.meetingId) })
    },
  })
}

export function useUpdateParticipantRsvp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      meetingId,
      participantId,
      rsvpStatus,
    }: {
      meetingId: string
      participantId: string
      rsvpStatus: RsvpStatus
    }) => meetingsService.updateParticipantRsvp(meetingId, participantId, rsvpStatus),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: meetingKeys.participants(variables.meetingId) })
    },
  })
}

export function useRemoveParticipant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ meetingId, participantId }: { meetingId: string; participantId: string }) =>
      meetingsService.removeParticipant(meetingId, participantId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: meetingKeys.participants(variables.meetingId) })
    },
  })
}

export function useResendParticipantInvite() {
  return useMutation({
    mutationFn: ({ meetingId, participantId }: { meetingId: string; participantId: string }) =>
      meetingsService.resendParticipantInvite(meetingId, participantId),
  })
}

export function useAgendaItems(id: string | undefined) {
  return useQuery({
    queryKey: meetingKeys.agendaItems(id ?? ""),
    queryFn: () => meetingsService.listAgendaItems(id!),
    enabled: !!id,
  })
}

export function useAddAgendaItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ meetingId, input }: { meetingId: string; input: AddAgendaItemInput }) =>
      meetingsService.addAgendaItem(meetingId, input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: meetingKeys.agendaItems(variables.meetingId) })
    },
  })
}

export function useMinutes(id: string | undefined) {
  return useQuery({
    queryKey: meetingKeys.minutes(id ?? ""),
    queryFn: () => meetingsService.getMinutes(id!),
    enabled: !!id,
  })
}

export function useMinutesItems(id: string | undefined) {
  return useQuery({
    queryKey: meetingKeys.minutesItems(id ?? ""),
    queryFn: () => meetingsService.listMinutesItems(id!),
    enabled: !!id,
  })
}

export function useAddMinutesItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ meetingId, input }: { meetingId: string; input: AddMinutesItemInput }) =>
      meetingsService.addMinutesItem(meetingId, input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: meetingKeys.minutesItems(variables.meetingId) })
      qc.invalidateQueries({ queryKey: meetingKeys.minutes(variables.meetingId) })
      qc.invalidateQueries({ queryKey: meetingKeys.actionItems(variables.meetingId) })
    },
  })
}

export function useFinalizeMinutes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (meetingId: string) => meetingsService.finalizeMinutes(meetingId),
    onSuccess: (_data, meetingId) => {
      qc.invalidateQueries({ queryKey: meetingKeys.minutes(meetingId) })
      qc.invalidateQueries({ queryKey: meetingKeys.minutesItems(meetingId) })
    },
  })
}

export function useEditFinalizedMinutesItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      itemId,
      input,
    }: {
      meetingId: string
      itemId: string
      input: EditFinalizedMinutesItemInput
    }) => meetingsService.editFinalizedMinutesItem(itemId, input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: meetingKeys.minutesItems(variables.meetingId) })
      qc.invalidateQueries({ queryKey: ["meetings", "minutesRevisions"] })
    },
  })
}

export function useMinutesRevisions(params: { limit?: number } = {}) {
  return useQuery({
    queryKey: ["meetings", "minutesRevisions", params] as const,
    queryFn: () => meetingsService.listMinutesRevisions(params),
  })
}

export function useActionItemStatusHistory(params: { limit?: number } = {}) {
  return useQuery({
    queryKey: ["meetings", "actionItemStatusHistory", params] as const,
    queryFn: () => meetingsService.listActionItemStatusHistory(params),
  })
}

export function useActionItems(id: string | undefined) {
  return useQuery({
    queryKey: meetingKeys.actionItems(id ?? ""),
    queryFn: () => meetingsService.listActionItems(id!),
    enabled: !!id,
  })
}

export function useAllActionItems(params: { ownerId?: string } = {}) {
  return useQuery({
    queryKey: ["meetings", "allActionItems", params] as const,
    queryFn: () => meetingsService.listAllActionItems(params),
  })
}

export function useAddActionItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ meetingId, input }: { meetingId: string; input: AddActionItemInput }) =>
      meetingsService.addActionItem(meetingId, input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: meetingKeys.actionItems(variables.meetingId) })
    },
  })
}

export function useUpdateActionItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      meetingId,
      actionItemId,
      input,
    }: {
      meetingId: string
      actionItemId: string
      input: UpdateActionItemInput
    }) => meetingsService.updateActionItem(meetingId, actionItemId, input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: meetingKeys.actionItems(variables.meetingId) })
    },
  })
}

export function useUpdateActionItemStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      meetingId,
      actionItemId,
      status,
    }: {
      meetingId: string
      actionItemId: string
      status: ActionItemStatus
    }) => meetingsService.updateActionItemStatus(meetingId, actionItemId, status),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: meetingKeys.actionItems(variables.meetingId) })
    },
  })
}

export function useDeleteActionItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ meetingId, actionItemId }: { meetingId: string; actionItemId: string }) =>
      meetingsService.deleteActionItem(meetingId, actionItemId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: meetingKeys.actionItems(variables.meetingId) })
    },
  })
}
