import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useEditFinalizedMinutesItem } from "@/hooks/useMeetings"
import type { MinutesItem } from "@/types"

export function EditMinutesItemDialog({
  meetingId,
  open,
  onOpenChange,
  item,
}: {
  meetingId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  item: MinutesItem | undefined
}) {
  const editItem = useEditFinalizedMinutesItem()

  const [topic, setTopic] = useState("")
  const [notes, setNotes] = useState("")
  const [decision, setDecision] = useState("")
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (!open || !item) return
    setTopic(item.topic)
    setNotes(item.notes)
    setDecision(item.decision ?? "")
    setReason("")
  }, [open, item])

  async function handleSubmit() {
    if (!item) return
    if (!topic.trim() || !notes.trim()) {
      toast.error("Topic and notes can't be empty")
      return
    }
    if (!reason.trim()) {
      toast.error("Enter a reason for this edit")
      return
    }
    try {
      await editItem.mutateAsync({
        meetingId,
        itemId: item.id,
        input: { topic: topic.trim(), notes: notes.trim(), decision: decision.trim() || undefined, reason: reason.trim() },
      })
      toast.success("Minutes entry updated — the edit and your reason are now on the audit trail")
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update minutes entry")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Finalized Minutes Entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            These minutes are finalized. Your edit and reason will be recorded on the audit trail.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5">Topic</Label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5">Decision (optional)</Label>
              <Input value={decision} onChange={(e) => setDecision(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="mb-1.5">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div>
            <Label className="mb-1.5">Reason for this edit *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this being changed after finalization?"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={editItem.isPending || !topic.trim() || !notes.trim() || !reason.trim()}
          >
            {editItem.isPending && <Loader2 className="size-4 animate-spin" />}
            Save Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
