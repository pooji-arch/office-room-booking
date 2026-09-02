import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { MeetingDetailsCard } from "@/components/shared/MeetingDetailsCard"
import { MeetingHistoryList } from "@/components/shared/MeetingHistoryList"
import { DialogBodySkeleton } from "@/components/shared/PageSkeletons"
import { useMeeting } from "@/hooks/useMeetings"
import { meetingDisplayStatus } from "@/lib/meeting-buckets"

// The calendar's "expand a meeting in place" popup — read-only summary only.
// Editing/reassigning/agenda/minutes/action items all live on the full
// meeting details page, reached from here via "View Full Details" (the
// caller supplies onViewDetails since only it knows whether that's
// /meetings/:id or /admin/meetings/:id).
export function MeetingDetailsDialogBody({
  meetingId,
  onViewDetails,
}: {
  meetingId: string
  onViewDetails?: () => void
}) {
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

      {onViewDetails && (
        <Button className="w-full" onClick={onViewDetails}>
          View Full Details
          <ArrowRight className="size-4" />
        </Button>
      )}
    </div>
  )
}
