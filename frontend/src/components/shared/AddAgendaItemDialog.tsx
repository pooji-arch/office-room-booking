import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { useAddAgendaItem, useUpdateAgendaItem } from "@/hooks/useMeetings"
import type { AgendaItem } from "@/types"

export interface AgendaAssignee {
  id: string
  name: string
  email?: string
}

export function AddAgendaItemDialog({
  meetingId,
  open,
  onOpenChange,
  agendaItem,
  eligibleAssignees,
}: {
  meetingId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  agendaItem?: AgendaItem
  // Scoped to the meeting's own organizer + participants — someone who
  // isn't attending shouldn't be assignable to an agenda topic they'll
  // never hear discussed.
  eligibleAssignees: AgendaAssignee[]
}) {
  const isEditMode = !!agendaItem
  const addAgendaItem = useAddAgendaItem()
  const updateAgendaItem = useUpdateAgendaItem()
  const [topic, setTopic] = useState("")
  const [ownerId, setOwnerId] = useState("")
  const [allottedMinutes, setAllottedMinutes] = useState("10")

  useEffect(() => {
    if (!open) return
    setTopic(agendaItem?.topic ?? "")
    setOwnerId(agendaItem?.ownerId ?? "")
    setAllottedMinutes(String(agendaItem?.allottedMinutes ?? 10))
  }, [open, agendaItem])

  const isPending = addAgendaItem.isPending || updateAgendaItem.isPending

  async function handleSubmit() {
    if (!topic.trim()) {
      toast.error("Enter a topic")
      return
    }
    try {
      if (isEditMode && agendaItem) {
        await updateAgendaItem.mutateAsync({
          meetingId,
          agendaItemId: agendaItem.id,
          input: {
            topic: topic.trim(),
            ownerId: ownerId || undefined,
            allottedMinutes: Number(allottedMinutes) || 10,
          },
        })
        toast.success("Agenda item updated")
      } else {
        await addAgendaItem.mutateAsync({
          meetingId,
          input: {
            topic: topic.trim(),
            ownerId: ownerId || undefined,
            allottedMinutes: Number(allottedMinutes) || 10,
          },
        })
        toast.success("Agenda item added")
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save agenda item")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Agenda Item" : "Add Agenda Item"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5">Topic</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Q1 budget review" />
          </div>

          <div>
            <Label className="mb-1.5">Owner (optional)</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No owner assigned" />
              </SelectTrigger>
              <SelectContent>
                {eligibleAssignees.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                    {u.email ? ` — ${u.email}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5">Allotted minutes</Label>
            <Input
              type="number"
              min={1}
              value={allottedMinutes}
              onChange={(e) => setAllottedMinutes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !topic.trim()}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isEditMode ? "Save Changes" : "Add Agenda Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
