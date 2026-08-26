import { useState } from "react"
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
import { useActiveUsers } from "@/hooks/useUsers"
import { useAddAgendaItem } from "@/hooks/useMeetings"

export function AddAgendaItemDialog({
  meetingId,
  open,
  onOpenChange,
}: {
  meetingId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: users } = useActiveUsers()
  const addAgendaItem = useAddAgendaItem()
  const [topic, setTopic] = useState("")
  const [ownerId, setOwnerId] = useState("")
  const [allottedMinutes, setAllottedMinutes] = useState("10")

  async function handleAdd() {
    if (!topic.trim()) {
      toast.error("Enter a topic")
      return
    }
    try {
      await addAgendaItem.mutateAsync({
        meetingId,
        input: {
          topic: topic.trim(),
          ownerId: ownerId || undefined,
          allottedMinutes: Number(allottedMinutes) || 10,
        },
      })
      toast.success("Agenda item added")
      setTopic("")
      setOwnerId("")
      setAllottedMinutes("10")
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add agenda item")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Agenda Item</DialogTitle>
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
                {(users?.data ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} — {u.email}
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
          <Button onClick={handleAdd} disabled={addAgendaItem.isPending || !topic.trim()}>
            {addAgendaItem.isPending && <Loader2 className="size-4 animate-spin" />}
            Add Agenda Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
