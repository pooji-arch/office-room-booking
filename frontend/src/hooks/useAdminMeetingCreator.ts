import { useMemo, useState } from "react"
import { toast } from "sonner"
import { useCreateMeeting } from "@/hooks/useMeetings"
import { useActiveUsers } from "@/hooks/useUsers"
import { useRoomAvailability, useRooms } from "@/hooks/useRooms"
import { useAuth } from "@/hooks/useAuth"
import { toDateInputValue } from "@/lib/format"
import { dedupeCaseInsensitive } from "@/lib/utils"
import type { MeetingType } from "@/types"

type TimeRange = { start: string; end: string }

// Shared business logic behind the admin "Book a Meeting" flow — its own
// dedicated page (MeetingCreatePage), mirroring useAdminMeetingEditor's
// shape but for creating a brand-new meeting rather than editing an
// existing one, so there's no "meeting" to load and no cancel/reassign
// history to carry.
export function useAdminMeetingCreator() {
  const { user } = useAuth()
  const { data: users } = useActiveUsers()
  const { data: rooms } = useRooms({ pageSize: 100 })
  const createMeeting = useCreateMeeting()

  // Sourced from user profiles' own department field (admin-curated at
  // account creation) rather than free text typed at booking time — the
  // whole point is to stop new department name variants ("Operation" vs
  // "Operations", "development" vs "Development") from ever being created.
  const departments = useMemo(
    () => dedupeCaseInsensitive((users?.data ?? []).map((u) => u.department).filter(Boolean) as string[]),
    [users]
  )

  const [bookedById, setBookedById] = useState(user?.id ?? "")
  const [roomId, _setRoomId] = useState("")
  const [purpose, setPurpose] = useState("")
  const [department, setDepartment] = useState("")
  const [type, setType] = useState<MeetingType>("INTERNAL")
  const [selectedDate, _setSelectedDate] = useState(new Date())
  const [selectedRange, setSelectedRange] = useState<TimeRange | null>(null)

  function setRoomId(v: string) {
    _setRoomId(v)
    setSelectedRange(null)
  }

  function setSelectedDate(d: Date) {
    _setSelectedDate(d)
    setSelectedRange(null)
  }

  const dateStr = toDateInputValue(selectedDate)
  const { data: availability, isLoading: isLoadingSlots } = useRoomAvailability(
    roomId || undefined,
    dateStr || undefined
  )

  const isSaving = createMeeting.isPending

  async function onSubmit(): Promise<string | null> {
    if (!bookedById) {
      toast.error("Select an organizer")
      return null
    }
    if (!roomId) {
      toast.error("Select a room")
      return null
    }
    if (!purpose.trim()) {
      toast.error("Purpose is required")
      return null
    }
    if (!department.trim()) {
      toast.error("Department is required")
      return null
    }
    if (!selectedRange) {
      toast.error("Select an available time slot")
      return null
    }
    try {
      const meeting = await createMeeting.mutateAsync({
        roomId,
        date: dateStr,
        startTime: selectedRange.start,
        endTime: selectedRange.end,
        bookedById,
        purpose: purpose.trim(),
        department: department.trim(),
        type,
      })
      toast.success("Meeting booked")
      return meeting.id
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to book meeting")
      return null
    }
  }

  return {
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
      roomId,
      setRoomId,
      purpose,
      setPurpose,
      department,
      setDepartment,
      type,
      setType,
    },
    schedule: { selectedDate, setSelectedDate, selectedRange, setSelectedRange, dateStr },
  }
}
