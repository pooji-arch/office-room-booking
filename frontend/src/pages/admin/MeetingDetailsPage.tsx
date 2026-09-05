import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { DetailPageSkeleton } from "@/components/shared/PageSkeletons"
import { MeetingDetailsCard } from "@/components/shared/MeetingDetailsCard"
import { MeetingApprovalCard } from "@/components/shared/MeetingApprovalCard"
import { MeetingHistoryList } from "@/components/shared/MeetingHistoryList"
import { MeetingParticipantsCard } from "@/components/shared/MeetingParticipantsCard"
import { AgendaCard } from "@/components/shared/AgendaCard"
import { MinutesCard } from "@/components/shared/MinutesCard"
import { ActionItemsCard } from "@/components/shared/ActionItemsCard"
import { ReviewNextMeetingCard } from "@/components/shared/ReviewNextMeetingCard"
import { MeetingDetailTabs } from "@/components/shared/MeetingDetailTabs"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { useCancelMeeting, useMeeting, useMeetings } from "@/hooks/useMeetings"
import { useAuth } from "@/hooks/useAuth"
import { meetingDisplayStatus } from "@/lib/meeting-buckets"

export function MeetingDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: meeting, isLoading } = useMeeting(id)
  const cancelMeeting = useCancelMeeting()
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const { data: followUps } = useMeetings(
    { previousMeetingId: meeting?.id ?? "", pageSize: 1 },
    { enabled: !!meeting }
  )

  if (isLoading || !meeting) {
    return <DetailPageSkeleton />
  }

  const displayStatus = meetingDisplayStatus(meeting)
  const isReadOnly = displayStatus === "COMPLETED"
  const isCancelled = meeting.status === "CANCELLED"
  const isOrganizerOrAdmin = (user?.role === "ADMIN" || user?.id === meeting.bookedBy.id) && !isCancelled
  const existingFollowUp = followUps?.data[0]

  async function handleCancel() {
    if (!meeting) return
    try {
      await cancelMeeting.mutateAsync({ id: meeting.id, reason: "Cancelled by admin" })
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

        {!isReadOnly && meeting.status !== "CANCELLED" && (
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel Meeting
            </Button>
            {/* replace, not a plain push — see MeetingEditPage for why */}
            <Button
              variant="outline"
              onClick={() => navigate(`/admin/meetings/${meeting.id}/edit`, { replace: true })}
            >
              <Pencil className="size-4" />
              Edit & Reassign
            </Button>
          </div>
        )}

        <MeetingApprovalCard meeting={meeting} isAdmin />

        {existingFollowUp && (
          <p className="text-sm text-muted-foreground">Follow-up meeting: {existingFollowUp.code}</p>
        )}

        {meeting.status === "CANCELLED" && meeting.cancellationReason && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {meeting.declined ? "Declined" : "Cancelled"}
            {meeting.cancelledAt ? ` on ${new Date(meeting.cancelledAt).toLocaleDateString()}` : ""}
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
                    isOrganizerOrAdmin={isOrganizerOrAdmin}
                    previousMeetingId={meeting.previousMeetingId}
                    organizer={meeting.bookedBy}
                  />
                  <MeetingParticipantsCard
                    meetingId={meeting.id}
                    organizerId={meeting.bookedBy.id}
                    isOrganizerOrAdmin={isOrganizerOrAdmin}
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
                  isOrganizerOrAdmin={isOrganizerOrAdmin}
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
                  isOrganizerOrAdmin={isOrganizerOrAdmin}
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
                  isOrganizerOrAdmin={isOrganizerOrAdmin}
                  isOrganizer={user?.id === meeting.bookedBy.id}
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
        description={`Meeting ${meeting.code} will be cancelled and the room slot freed up for others.`}
        confirmLabel="Cancel Meeting"
        destructive
        isLoading={cancelMeeting.isPending}
        onConfirm={handleCancel}
      />
    </div>
  )
}
