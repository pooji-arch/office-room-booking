import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/EmptyState"
import { DetailPageSkeleton } from "@/components/shared/PageSkeletons"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { MeetingDetailsCard } from "@/components/shared/MeetingDetailsCard"
import { MeetingParticipantsCard } from "@/components/shared/MeetingParticipantsCard"
import { AgendaCard } from "@/components/shared/AgendaCard"
import { MinutesCard } from "@/components/shared/MinutesCard"
import { ActionItemsCard } from "@/components/shared/ActionItemsCard"
import { ReviewNextMeetingCard } from "@/components/shared/ReviewNextMeetingCard"
import { MeetingDetailTabs } from "@/components/shared/MeetingDetailTabs"
import { MeetingHistoryList } from "@/components/shared/MeetingHistoryList"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { TransferOrganizerDialog } from "@/components/shared/TransferOrganizerDialog"
import {
  useActionItems,
  useCancelMeeting,
  useMeeting,
  useMeetingParticipants,
  useMeetings,
} from "@/hooks/useMeetings"
import { useAuth } from "@/hooks/useAuth"
import { meetingDisplayStatus } from "@/lib/meeting-buckets"

export function UserMeetingDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: meeting, isLoading } = useMeeting(id)
  const { data: participants, isLoading: isLoadingParticipants } = useMeetingParticipants(id)
  const { data: actionItems, isLoading: isLoadingActionItems } = useActionItems(id)
  const cancelMeeting = useCancelMeeting()
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showTransferDialog, setShowTransferDialog] = useState(false)

  const { data: followUps } = useMeetings(
    { previousMeetingId: meeting?.id ?? "", pageSize: 1 },
    { enabled: !!meeting }
  )

  if (isLoading || isLoadingParticipants || isLoadingActionItems) {
    return <DetailPageSkeleton />
  }

  const isOrganizer = !!meeting && meeting.bookedBy.id === user?.id
  const isParticipant = !!participants?.some((p) => p.profileId === user?.id)
  const isChair = !!participants?.some((p) => p.profileId === user?.id && p.role === "CHAIR")
  const isActionItemOwner = !!actionItems?.some((item) => item.ownerId === user?.id)

  if (!meeting || (!isOrganizer && !isParticipant && !isActionItemOwner)) {
    return (
      <EmptyState
        icon={SearchX}
        title="Meeting not found"
        description="This meeting doesn't exist or isn't yours to view."
        action={<Button onClick={() => navigate("/meetings")}>Back to Meetings</Button>}
      />
    )
  }

  const displayStatus = meetingDisplayStatus(meeting)
  const isCancelled = meeting.status === "CANCELLED"
  const isFinal = isCancelled || displayStatus === "COMPLETED"
  // Cancel/Reschedule, participant management, and the Review & Next
  // Meeting tab (booking a follow-up is its own structural, organizer-level
  // decision) all stay organizer-only, per explicit request. A Chair only
  // gets the same rights as the organizer for this meeting's own content —
  // agenda, minutes, action items — matched by the RLS policies in
  // migration 0020/0021, which are what actually enforce this; canEdit here
  // just controls whether the UI shows controls that would work.
  const canEdit = isOrganizer && !isCancelled
  const canEditContent = (isOrganizer || isChair) && !isCancelled
  const existingFollowUp = followUps?.data[0]

  async function confirmCancel() {
    if (!meeting) return
    try {
      await cancelMeeting.mutateAsync({ id: meeting.id })
      toast.success("Meeting cancelled")
      setShowCancelConfirm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel meeting")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-extrabold tracking-tight">Meeting Details</h1>
        </div>
        <StatusBadge status={displayStatus} />
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <MeetingDetailsCard meeting={meeting} />
          <MeetingHistoryList meetingId={meeting.id} />
        </div>

        {isOrganizer && !isFinal && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel Meeting
            </Button>
            {/* replace, not a plain push — see MeetingReschedulePage for why */}
            <Button
              variant="outline"
              onClick={() => navigate(`/meetings/${meeting.id}/reschedule`, { replace: true })}
            >
              Reschedule
            </Button>
            <Button variant="outline" onClick={() => setShowTransferDialog(true)}>
              Transfer Organizer
            </Button>
          </div>
        )}

        {existingFollowUp && (
          <p className="text-sm text-muted-foreground">Follow-up meeting: {existingFollowUp.code}</p>
        )}

        {meeting.status === "CANCELLED" && meeting.cancellationReason && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            Cancelled{meeting.cancelledAt ? ` on ${new Date(meeting.cancelledAt).toLocaleDateString()}` : ""}
            {meeting.cancellationReason ? `: ${meeting.cancellationReason}` : ""}
          </div>
        )}
        {meeting.reassignedAt && (
          <div className="rounded-lg bg-accent p-3 text-sm text-accent-foreground">
            Reassigned by {meeting.reassignedByName ?? "an admin"} on{" "}
            {new Date(meeting.reassignedAt).toLocaleDateString()}
            {meeting.reassignmentReason ? ` — ${meeting.reassignmentReason}` : ""}
          </div>
        )}
        {meeting.organizerTransferredAt && (
          <div className="rounded-lg bg-accent p-3 text-sm text-accent-foreground">
            Organizer transferred from {meeting.previousOrganizerName ?? "a previous organizer"} to{" "}
            {meeting.bookedBy.name} on {new Date(meeting.organizerTransferredAt).toLocaleDateString()}
          </div>
        )}

        <MeetingDetailTabs
          tabs={[
            {
              value: "agenda",
              label: "Agenda & RSVPs",
              content: (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <AgendaCard
                    meetingId={meeting.id}
                    isOrganizerOrAdmin={canEditContent}
                    previousMeetingId={meeting.previousMeetingId}
                    organizer={meeting.bookedBy}
                  />
                  <MeetingParticipantsCard
                    meetingId={meeting.id}
                    organizerId={meeting.bookedBy.id}
                    isOrganizerOrAdmin={canEdit}
                    currentUserId={user?.id}
                    previousMeetingId={meeting.previousMeetingId}
                  />
                </div>
              ),
            },
            {
              value: "minutes",
              label: "Minutes of Meeting",
              content: (
                <MinutesCard
                  meetingId={meeting.id}
                  isOrganizerOrAdmin={canEditContent}
                  previousMeetingId={meeting.previousMeetingId}
                />
              ),
            },
            {
              value: "actions",
              label: "Action Items",
              content: (
                <ActionItemsCard
                  meetingId={meeting.id}
                  isOrganizerOrAdmin={canEditContent}
                  currentUserId={user?.id}
                  previousMeetingId={meeting.previousMeetingId}
                />
              ),
            },
            {
              value: "review",
              label: "Review & Next Meeting",
              content: (
                <ReviewNextMeetingCard
                  meetingId={meeting.id}
                  meeting={meeting}
                  isOrganizerOrAdmin={canEdit}
                  isOrganizer={isOrganizer}
                  existingFollowUp={existingFollowUp}
                />
              ),
            },
          ]}
        />
      </div>

      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Cancel this meeting?"
        description={`Meeting ${meeting.code} for ${meeting.roomName} will be cancelled and the slot freed up.`}
        confirmLabel="Cancel Meeting"
        destructive
        isLoading={cancelMeeting.isPending}
        onConfirm={confirmCancel}
      />

      <TransferOrganizerDialog
        meetingId={meeting.id}
        currentOrganizerId={meeting.bookedBy.id}
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
      />
    </div>
  )
}
