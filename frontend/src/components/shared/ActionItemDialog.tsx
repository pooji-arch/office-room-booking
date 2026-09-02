import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/shared/DatePicker"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useActiveUsers } from "@/hooks/useUsers"
import { useAddActionItem, useMinutesItems, useUpdateActionItem } from "@/hooks/useMeetings"
import type { ActionItem, ActionItemPriority } from "@/types"

export function ActionItemDialog({
  meetingId,
  open,
  onOpenChange,
  actionItem,
}: {
  meetingId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  actionItem?: ActionItem
}) {
  const isEditMode = !!actionItem
  const { data: users } = useActiveUsers()
  const { data: minutesItems } = useMinutesItems(meetingId)
  const addActionItem = useAddActionItem()
  const updateActionItem = useUpdateActionItem()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [ownerId, setOwnerId] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [priority, setPriority] = useState<ActionItemPriority>("MEDIUM")
  const [minutesItemId, setMinutesItemId] = useState("")

  useEffect(() => {
    if (!open) return
    setTitle(actionItem?.title ?? "")
    setDescription(actionItem?.description ?? "")
    setOwnerId(actionItem?.ownerId ?? "")
    setDueDate(actionItem?.dueDate ?? "")
    setPriority(actionItem?.priority ?? "MEDIUM")
    setMinutesItemId("")
  }, [open, actionItem])

  const decisionItems = (minutesItems ?? []).filter((item) => item.decision)
  const isPending = addActionItem.isPending || updateActionItem.isPending

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("Enter a title")
      return
    }
    try {
      if (isEditMode && actionItem) {
        await updateActionItem.mutateAsync({
          meetingId,
          actionItemId: actionItem.id,
          input: {
            title: title.trim(),
            description: description.trim() || undefined,
            ownerId: ownerId || undefined,
            dueDate: dueDate || undefined,
            priority,
          },
        })
        toast.success("Action item updated")
      } else {
        const owner = users?.data.find((u) => u.id === ownerId)
        await addActionItem.mutateAsync({
          meetingId,
          input: {
            title: title.trim(),
            description: description.trim() || undefined,
            ownerId: ownerId || undefined,
            dueDate: dueDate || undefined,
            minutesItemId: minutesItemId || undefined,
            priority,
          },
        })
        toast.success(
          owner
            ? `Action item assigned to ${owner.name} — notifications aren't wired up yet, they'll see this once they check the app.`
            : "Action item added"
        )
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save action item")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Action Item" : "Add Action Item"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Send updated proposal" />
          </div>

          <div>
            <Label className="mb-1.5">Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="More detail on what's needed" />
          </div>

          <div>
            <Label className="mb-1.5">Owner (optional)</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No owner assigned" />
              </SelectTrigger>
              <SelectContent>
                {(users?.data ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} — {u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5">Due Date (optional)</Label>
            <DatePicker
              value={dueDate}
              onChange={setDueDate}
              placeholder="No due date"
              minDate={new Date().toISOString().slice(0, 10)}
              className="w-full"
            />
          </div>

          <div>
            <Label className="mb-1.5">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as ActionItemPriority)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!isEditMode && decisionItems.length > 0 && (
            <div>
              <Label className="mb-1.5">Source decision (optional)</Label>
              <Select value={minutesItemId} onValueChange={setMinutesItemId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Not linked to a decision" />
                </SelectTrigger>
                <SelectContent>
                  {decisionItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.topic} — {item.decision}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !title.trim()}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isEditMode ? "Save Changes" : "Add Action Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
