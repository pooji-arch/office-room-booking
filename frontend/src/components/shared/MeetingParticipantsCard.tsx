import { useState } from "react"
import { toast } from "sonner"
import { BellRing, Check, Loader2, UserPlus, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { AddParticipantDialog } from "@/components/shared/AddParticipantDialog"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { CardContentSkeleton } from "@/components/shared/PageSkeletons"
import {
  useMeetingParticipants,
  useRemoveParticipant,
  useResendParticipantInvite,
  useUpdateParticipantRsvp,
} from "@/hooks/useMeetings"
import type { MeetingParticipant } from "@/types"

export function MeetingParticipantsCard({
  meetingId,
  organizerId,
  isOrganizerOrAdmin,
  currentUserId,
}: {
  meetingId: string
  organizerId: string
  isOrganizerOrAdmin: boolean
  currentUserId: string | undefined
}) {
  const { data: participants, isLoading } = useMeetingParticipants(meetingId)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [removingParticipant, setRemovingParticipant] = useState<MeetingParticipant | undefined>(undefined)
  const updateRsvp = useUpdateParticipantRsvp()
  const removeParticipant = useRemoveParticipant()
  const resendInvite = useResendParticipantInvite()

  async function handleRsvp(participant: MeetingParticipant, rsvpStatus: "ACCEPTED" | "DECLINED") {
    try {
      await updateRsvp.mutateAsync({ meetingId, participantId: participant.id, rsvpStatus })
      toast.success(rsvpStatus === "ACCEPTED" ? "You accepted the invite" : "You declined the invite")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update your RSVP")
    }
  }

  async function handleInvite(participant: MeetingParticipant) {
    try {
      await resendInvite.mutateAsync({ meetingId, participantId: participant.id })
      toast.success(`Invite reminder sent to ${participant.name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invite reminder")
    }
  }

  async function handleRemove() {
    if (!removingParticipant) return
    try {
      await removeParticipant.mutateAsync({ meetingId, participantId: removingParticipant.id })
      toast.success("Participant removed")
      setRemovingParticipant(undefined)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove participant")
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-muted-foreground" />
            Participants
          </CardTitle>
          {isOrganizerOrAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
              <UserPlus className="size-4" />
              Add Participant
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <CardContentSkeleton lines={2} />
        ) : !participants || participants.length === 0 ? (
          <p className="text-sm text-muted-foreground">No participants added yet.</p>
        ) : (
          participants.map((p) => {
            const isMe = !!currentUserId && p.profileId === currentUserId
            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{p.name}</p>
                  {p.email && <p className="text-xs text-muted-foreground">{p.email}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={p.role} />
                  <StatusBadge status={p.rsvpStatus} />

                  {isOrganizerOrAdmin && (
                    <>
                      {p.rsvpStatus !== "ACCEPTED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleInvite(p)}
                          disabled={resendInvite.isPending}
                        >
                          <BellRing className="size-3.5" />
                          Invite
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => setRemovingParticipant(p)}
                      >
                        <X className="size-3.5" />
                        Remove
                      </Button>
                    </>
                  )}

                  {isMe && p.rsvpStatus !== "ACCEPTED" && (
                    <Button size="sm" onClick={() => handleRsvp(p, "ACCEPTED")} disabled={updateRsvp.isPending}>
                      {updateRsvp.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )}
                      Accept
                    </Button>
                  )}
                  {isMe && p.rsvpStatus !== "DECLINED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => handleRsvp(p, "DECLINED")}
                      disabled={updateRsvp.isPending}
                    >
                      <X className="size-3.5" />
                      Decline
                    </Button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </CardContent>

      {isOrganizerOrAdmin && (
        <AddParticipantDialog
          meetingId={meetingId}
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          existingParticipantIds={[
            organizerId,
            ...(participants ?? []).map((p) => p.profileId).filter((id): id is string => !!id),
          ]}
        />
      )}

      <ConfirmDialog
        open={!!removingParticipant}
        onOpenChange={(open) => !open && setRemovingParticipant(undefined)}
        title="Remove this participant?"
        description={`"${removingParticipant?.name}" will be removed from this meeting.`}
        confirmLabel="Remove"
        destructive
        isLoading={removeParticipant.isPending}
        onConfirm={handleRemove}
      />
    </Card>
  )
}
