import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { useMeeting, useCancelMeeting, useReassignMeeting, useUpdateMeeting } from "@/hooks/useMeetings"
import { useActiveUsers } from "@/hooks/useUsers"
import { useRoomAvailability, useRooms } from "@/hooks/useRooms"
import { meetingDisplayStatus } from "@/lib/meeting-buckets"
import { toDateInputValue } from "@/lib/format"
import { dedupeCaseInsensitive, ensureIncluded } from "@/lib/utils"
import type { MeetingType } from "@/types"

type TimeRange = { start: string; end: string }

// Shared business logic behind the admin "Edit & Reassign" flow — its own
// dedicated page (MeetingEditPage), so a future second consumer can't
// quietly drift on what's editable/valid/submittable.
export function useAdminMeetingEditor(meetingId: string | undefined) {
  const { data: meeting, isLoading } = useMeeting(meetingId)
  const { data: users } = useActiveUsers()
  const { data: rooms } = useRooms({ pageSize: 100 })
  const reassign = useReassignMeeting()
  const updateMeeting = useUpdateMeeting()
  const cancelMeeting = useCancelMeeting()
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const [bookedById, setBookedById] = useState("")
  const [purpose, setPurpose] = useState("")
  const [department, setDepartment] = useState("")
  const [type, setType] = useState<MeetingType>("INTERNAL")
  const [reason, setReason] = useState("")
  const [roomId, _setRoomId] = useState<string | null>(null)
  const [selectedDate, _setSelectedDate] = useState<Date | null>(null)
  const [selectedRange, setSelectedRange] = useState<TimeRange | null>(null)
  const [initializedForId, setInitializedForId] = useState<string | undefined>(undefined)

  // Same source as the creator form — user profiles' own department field —
  // plus this meeting's own current value if it's a stale variant that
  // wouldn't otherwise match anything (so editing an old meeting doesn't
  // render the select blank).
  const departments = useMemo(
    () =>
      ensureIncluded(
        dedupeCaseInsensitive((users?.data ?? []).map((u) => u.department).filter(Boolean) as string[]),
        meeting?.department
      ),
    [users, meeting?.department]
  )

  // Keyed to meeting.id, not to `meeting` itself: onSubmit fires reassign
  // and update as two sequential mutations, and reassign's own cache
  // invalidation refetches this same query (with pre-edit purpose/
  // department/type) before the update mutation has landed its changes.
  // Re-running this on every `meeting` change would snap the controlled
  // inputs back to that stale mid-save data. Initializing once per meeting
  // id means a genuine navigation to a different meeting still resets the
  // form, but a background refetch of the meeting you're already editing
  // never stomps on it.
  useEffect(() => {
    if (meeting && meeting.id !== initializedForId) {
      setBookedById(meeting.bookedBy.id)
      setPurpose(meeting.purpose)
      setDepartment(meeting.department ?? "")
      setType(meeting.type)
      setInitializedForId(meeting.id)
    }
  }, [meeting, initializedForId])

  function setRoomId(v: string) {
    _setRoomId(v)
    setSelectedRange(null)
  }

  function setSelectedDate(d: Date) {
    _setSelectedDate(d)
    setSelectedRange(null)
  }

  const effectiveRoomId = roomId ?? meeting?.roomId ?? ""
  const effectiveDateStr = selectedDate ? toDateInputValue(selectedDate) : (meeting?.date ?? "")
  // TimeRangeInput reports its own initial (default) value on mount, so
  // selectedRange is already populated once mounted — it's only ever null
  // while the user has actually left the fields in an invalid state, which
  // must correctly block Save rather than silently falling back to the
  // meeting's original time.
  const effectiveRange = selectedRange

  const { data: availability, isLoading: isLoadingSlots } = useRoomAvailability(
    effectiveRoomId || undefined,
    effectiveDateStr || undefined,
    meeting?.id
  )

  const displayStatus = meeting ? meetingDisplayStatus(meeting) : null
  const isReadOnly = displayStatus === "COMPLETED"
  const isSaving = reassign.isPending || updateMeeting.isPending

  async function onSubmit(): Promise<boolean> {
    if (!meeting || !effectiveRange) return false
    if (!purpose.trim()) {
      toast.error("Purpose is required")
      return false
    }
    if (!department.trim()) {
      toast.error("Department is required")
      return false
    }
    try {
      // Kept as two separate flags, not one combined "scheduleChanged" —
      // reassign_at (organizer override) and rescheduled_at (time/room
      // change) are independent facts, and reassignMeeting only stamps
      // each one when its own flag says it actually happened.
      const timeChanged =
        effectiveRoomId !== meeting.roomId ||
        effectiveDateStr !== meeting.date ||
        effectiveRange.start !== meeting.startTime ||
        effectiveRange.end !== meeting.endTime
      const organizerChanged = bookedById !== meeting.bookedBy.id

      if (timeChanged || organizerChanged) {
        await reassign.mutateAsync({
          id: meeting.id,
          input: {
            roomId: effectiveRoomId,
            date: effectiveDateStr,
            startTime: effectiveRange.start,
            endTime: effectiveRange.end,
            bookedById,
            reason: reason || "Updated by admin",
            timeChanged,
            organizerChanged,
          },
        })
      }
      if (
        purpose !== meeting.purpose ||
        department !== (meeting.department ?? "") ||
        type !== meeting.type
      ) {
        await updateMeeting.mutateAsync({
          id: meeting.id,
          input: { purpose, department, type },
        })
      }
      toast.success("Meeting updated")
      setReason("")
      _setRoomId(null)
      _setSelectedDate(null)
      setSelectedRange(null)
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update meeting")
      return false
    }
  }

  async function confirmCancel() {
    if (!meeting) return
    try {
      await cancelMeeting.mutateAsync({ id: meeting.id, reason: "Cancelled by admin" })
      toast.success("Meeting cancelled")
      setShowCancelConfirm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel meeting")
    }
  }

  return {
    meeting,
    isLoading,
    isReadOnly,
    displayStatus,
    users,
    rooms,
    departments,
    availability,
    isLoadingSlots,
    isSaving,
    onSubmit,
    form: {
      bookedById,
      setBookedById,
      purpose,
      setPurpose,
      department,
      setDepartment,
      type,
      setType,
      reason,
      setReason,
    },
    schedule: {
      effectiveRoomId,
      effectiveDateStr,
      effectiveRange,
      selectedDate,
      setRoomId,
      setSelectedDate,
      setSelectedRange,
    },
    cancel: {
      show: showCancelConfirm,
      setShow: setShowCancelConfirm,
      confirm: confirmCancel,
      isPending: cancelMeeting.isPending,
    },
  }
}
