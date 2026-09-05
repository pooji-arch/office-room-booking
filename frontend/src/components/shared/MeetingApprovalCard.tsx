import { useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useResolveMeetingApproval } from "@/hooks/useMeetings"
import { formatDateLong, formatTimeRange } from "@/lib/format"
import type { Meeting } from "@/types"

const REQUEST_LABEL: Record<string, string> = {
  BOOKING: "This booking",
  RESCHEDULE: "This reschedule request",
  CANCELLATION: "This cancellation request",
}

// Shown on both the admin and user meeting-details pages whenever a
// non-admin's booking/reschedule/cancel is awaiting sign-off — read-only for
// the organizer, with Approve/Reject actions when isAdmin is true.
export function MeetingApprovalCard({ meeting, isAdmin }: { meeting: Meeting; isAdmin: boolean }) {
  const resolve = useResolveMeetingApproval()
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState("")

  if (meeting.approvalStatus !== "PENDING" || meeting.status === "CANCELLED") return null

  const requestLabel = REQUEST_LABEL[meeting.pendingAction ?? "BOOKING"]
  const hasPreviousSchedule =
    meeting.pendingAction === "RESCHEDULE" &&
    meeting.pendingPreviousDate &&
    meeting.pendingPreviousStartTime &&
    meeting.pendingPreviousEndTime

  async function handleApprove() {
    try {
      await resolve.mutateAsync({ id: meeting.id, approve: true })
      toast.success("Request approved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve request")
    }
  }

  async function handleReject() {
    try {
      await resolve.mutateAsync({ id: meeting.id, approve: false, note: reason.trim() || undefined })
      toast.success("Request rejected")
      setShowReject(false)
      setReason("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject request")
    }
  }

  return (
    <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
      <p>
        {requestLabel} is awaiting admin approval — the room/time shown above is being held for it.
        {hasPreviousSchedule && (
          <>
            {" "}
            Previously scheduled for {formatDateLong(meeting.pendingPreviousDate!)} ·{" "}
            {formatTimeRange(meeting.pendingPreviousStartTime!, meeting.pendingPreviousEndTime!)}.
          </>
        )}
      </p>
      {isAdmin && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" onClick={handleApprove} disabled={resolve.isPending}>
            {resolve.isPending && <Loader2 className="size-4 animate-spin" />}
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive/10"
            onClick={() => setShowReject(true)}
            disabled={resolve.isPending}
          >
            Reject
          </Button>
        </div>
      )}

      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this request?</DialogTitle>
            <DialogDescription>Optionally explain why — the organizer will see this.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason (optional)"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(false)} disabled={resolve.isPending}>
              Cancel
            </Button>
            <Button
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleReject}
              disabled={resolve.isPending}
            >
              {resolve.isPending && <Loader2 className="size-4 animate-spin" />}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
