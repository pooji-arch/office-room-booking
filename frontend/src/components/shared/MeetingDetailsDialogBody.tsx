import { DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { MeetingDetailsCard } from "@/components/shared/MeetingDetailsCard"
import { MeetingHistoryList } from "@/components/shared/MeetingHistoryList"
import { DialogBodySkeleton } from "@/components/shared/PageSkeletons"
import { useMeeting } from "@/hooks/useMeetings"
import { meetingDisplayStatus } from "@/lib/meeting-buckets"

// The Admin Calendar's "expand a meeting in place" popup — read-only
// details only, regardless of status. Editing/reassigning still happens on
// the dedicated admin/MeetingEditPage.tsx (reached via the Eye/View
// action), not here.
export function MeetingDetailsDialogBody({ meetingId }: { meetingId: string }) {
  const { data: meeting, isLoading } = useMeeting(meetingId)

  if (isLoading || !meeting) {
    return <DialogBodySkeleton />
  }

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {meeting.code}
          <StatusBadge status={meetingDisplayStatus(meeting)} />
        </DialogTitle>
      </DialogHeader>

      <MeetingDetailsCard meeting={meeting} />
      <MeetingHistoryList meetingId={meeting.id} />
    </div>
  )
}
