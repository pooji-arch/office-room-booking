import { useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, ClipboardList, Loader2, Pencil, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EditMinutesItemDialog } from "@/components/shared/EditMinutesItemDialog"
import { CardContentSkeleton } from "@/components/shared/PageSkeletons"
import { useAddMinutesItem, useFinalizeMinutes, useMeeting, useMinutes, useMinutesItems } from "@/hooks/useMeetings"
import { formatDateMedium } from "@/lib/format"
import type { MinutesItem } from "@/types"

export function MinutesCard({
  meetingId,
  isOrganizerOrAdmin,
  previousMeetingId,
}: {
  meetingId: string
  isOrganizerOrAdmin: boolean
  previousMeetingId?: string
}) {
  const { data: minutes, isLoading: minutesLoading } = useMinutes(meetingId)
  const { data: items, isLoading: itemsLoading } = useMinutesItems(meetingId)
  const { data: previousMeeting } = useMeeting(previousMeetingId)
  const { data: previousItems } = useMinutesItems(previousMeetingId)
  const addMinutesItem = useAddMinutesItem()
  const finalizeMinutes = useFinalizeMinutes()

  const [topic, setTopic] = useState("")
  const [notes, setNotes] = useState("")
  const [decision, setDecision] = useState("")
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false)
  const [editingItem, setEditingItem] = useState<MinutesItem | undefined>(undefined)

  const isFinal = minutes?.status === "FINAL"
  const canEdit = isOrganizerOrAdmin && !isFinal
  const canEditFinalized = isOrganizerOrAdmin && isFinal

  async function handleAddEntry() {
    if (!topic.trim() || !notes.trim()) {
      toast.error("Enter a topic and notes")
      return
    }
    const trimmedDecision = decision.trim()
    try {
      await addMinutesItem.mutateAsync({
        meetingId,
        input: { topic: topic.trim(), notes: notes.trim(), decision: trimmedDecision || undefined },
      })
      setTopic("")
      setNotes("")
      setDecision("")
      toast.success(
        trimmedDecision
          ? "Minutes entry added — an action item was generated from the decision."
          : "Minutes entry added"
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add minutes entry")
    }
  }

  async function handleFinalize() {
    try {
      await finalizeMinutes.mutateAsync(meetingId)
      toast.success(
        "Minutes finalized — distribution email isn't wired up yet, participants will see this once they check the app."
      )
      setShowFinalizeConfirm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to finalize minutes")
    }
  }

  const isLoading = minutesLoading || itemsLoading

  return (
    <>
      {!!previousItems?.length && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-4 text-muted-foreground" />
              Minutes History
              <span className="font-normal text-muted-foreground">
                — from &quot;{previousMeeting?.title ?? previousMeeting?.purpose}&quot;
                {previousMeeting?.date && ` · ${formatDateMedium(previousMeeting.date)}`}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {previousItems.map((item) => (
              <div key={item.id} className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="font-medium">{item.topic}</p>
                <p className="mt-1 text-muted-foreground">{item.notes}</p>
                {item.decision && (
                  <p className="mt-1.5 text-xs">
                    <span className="font-medium text-foreground">Decision: </span>
                    <span className="text-muted-foreground">{item.decision}</span>
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="size-4 text-muted-foreground" />
            Minutes of Meeting
          </CardTitle>
          {minutes && <StatusBadge status={minutes.status} />}
        </div>
        {isFinal && minutes?.finalizedBy && (
          <p className="text-xs text-muted-foreground">
            Finalized by {minutes.finalizedBy.name}
            {minutes.finalizedAt ? ` on ${new Date(minutes.finalizedAt).toLocaleString()}` : ""}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <CardContentSkeleton lines={4} />
        ) : (
          <>
            {!items || items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No minutes recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="rounded-lg border bg-muted/30 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{item.topic}</p>
                      {canEditFinalized && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0"
                          onClick={() => setEditingItem(item)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    <p className="mt-1 text-muted-foreground">{item.notes}</p>
                    {item.decision && (
                      <p className="mt-1.5 text-xs">
                        <span className="font-medium text-foreground">Decision: </span>
                        <span className="text-muted-foreground">{item.decision}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {canEdit && (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="mb-1.5">Topic</Label>
                    <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Budget review" />
                  </div>
                  <div>
                    <Label className="mb-1.5">Decision (optional)</Label>
                    <Input value={decision} onChange={(e) => setDecision(e.target.value)} placeholder="What was decided" />
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5">Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was discussed" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={handleAddEntry}
                    disabled={addMinutesItem.isPending || !topic.trim() || !notes.trim()}
                  >
                    {addMinutesItem.isPending && <Loader2 className="size-4 animate-spin" />}
                    <Plus className="size-4" />
                    Add to Minutes
                  </Button>
                  <Button onClick={() => setShowFinalizeConfirm(true)} disabled={!items?.length}>
                    <CheckCircle2 className="size-4" />
                    Finalize & Distribute
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      <ConfirmDialog
        open={showFinalizeConfirm}
        onOpenChange={setShowFinalizeConfirm}
        title="Finalize minutes?"
        description="Once finalized, these minutes will be locked for editing. Participants will see them the next time they check the app."
        confirmLabel="Finalize"
        isLoading={finalizeMinutes.isPending}
        onConfirm={handleFinalize}
      />

      <EditMinutesItemDialog
        meetingId={meetingId}
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(undefined)}
        item={editingItem}
      />
      </Card>
    </>
  )
}
