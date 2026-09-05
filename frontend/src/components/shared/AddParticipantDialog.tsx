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
import { useAddParticipant } from "@/hooks/useMeetings"
import type { ParticipantRole } from "@/types"

export function AddParticipantDialog({
  meetingId,
  open,
  onOpenChange,
}: {
  meetingId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const addParticipant = useAddParticipant()
  const [name, setName] = useState("")
  const [role, setRole] = useState<ParticipantRole>("PARTICIPANT")

  async function handleAdd() {
    if (!name.trim()) {
      toast.error("Enter a name")
      return
    }
    try {
      await addParticipant.mutateAsync({ meetingId, input: { externalName: name.trim(), role } })
      toast.success("Participant added")
      setName("")
      setRole("PARTICIPANT")
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add participant")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Participant</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Participant's name" />
          </div>

          <div>
            <Label className="mb-1.5">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as ParticipantRole)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PARTICIPANT">Participant</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={addParticipant.isPending || !name.trim()}>
            {addParticipant.isPending && <Loader2 className="size-4 animate-spin" />}
            Add Participant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
