import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { CalendarClock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CardContentSkeleton } from "@/components/shared/PageSkeletons"
import { useActionItems, useUpdateMeeting } from "@/hooks/useMeetings"
import { formatDateLong } from "@/lib/format"
import type { Meeting } from "@/types"

export function ReviewNextMeetingCard({
  meetingId,
  meeting,
  isOrganizerOrAdmin,
  isOrganizer,
  existingFollowUp,
}: {
  meetingId: string
  meeting: Meeting
  isOrganizerOrAdmin: boolean
  isOrganizer: boolean
  existingFollowUp: Meeting | undefined
}) {
  const navigate = useNavigate()
  const { data: actionItems, isLoading } = useActionItems(meetingId)
  const updateMeeting = useUpdateMeeting()
  const [reviewDate, setReviewDate] = useState(meeting.reviewDate ?? "")

  const openItems = (actionItems ?? []).filter((item) => item.status !== "DONE")
  const canReview = openItems.length > 0

  async function handleSaveReviewDate() {
    if (!reviewDate) {
      toast.error("Pick a date")
      return
    }
    try {
      await updateMeeting.mutateAsync({ id: meetingId, input: { reviewDate } })
      toast.success("Review date saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save review date")
    }
  }

  function handleScheduleFollowUp() {
    const params = new URLSearchParams({
      previousMeetingId: meeting.id,
      purpose: `Follow-up: ${meeting.title ?? meeting.purpose}`,
      department: meeting.department ?? "",
    })
    if (meeting.reviewDate) params.set("date", meeting.reviewDate)
    navigate(`/rooms/${meeting.roomId}?${params.toString()}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="size-4 text-muted-foreground" />
          Review Date & Next Meeting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <CardContentSkeleton lines={2} />
        ) : canReview ? (
          <>
            {isOrganizerOrAdmin && (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="mb-1.5">Next Review Date</Label>
                  <Input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
                </div>
                <Button variant="outline" onClick={handleSaveReviewDate} disabled={updateMeeting.isPending}>
                  {updateMeeting.isPending && <Loader2 className="size-4 animate-spin" />}
                  Save Review Date
                </Button>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Open action items ({openItems.length} pending) will be added as new agenda items on the follow-up
              meeting, and participants will be carried over, when it&apos;s created.
            </p>
            {isOrganizer && (
              <div>
                {existingFollowUp ? (
                  <Button variant="outline" onClick={() => navigate(`/meetings/${existingFollowUp.id}`)}>
                    View Follow-Up Meeting
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handleScheduleFollowUp}>
                    Schedule Follow-Up
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {(actionItems ?? []).length === 0
              ? "No action items yet — add at least one pending action item before scheduling a review or follow-up."
              : "All action items are completed — nothing pending, so no review date or follow-up meeting is needed."}
          </p>
        )}
        {meeting.reviewDate && (
          <p className="text-sm text-muted-foreground">
            Current review date: <span className="font-medium text-foreground">{formatDateLong(meeting.reviewDate)}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
