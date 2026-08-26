import { useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { useAddParticipant } from "@/hooks/useMeetings"
import type { MeetingParticipant, ParticipantRole } from "@/types"

export function AddParticipantDialog({
  meetingId,
  open,
  onOpenChange,
  existingParticipantIds,
}: {
  meetingId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  existingParticipantIds: string[]
}) {
  const { data: users } = useActiveUsers()
  const addParticipant = useAddParticipant()
  const [profileId, setProfileId] = useState("")
  const [role, setRole] = useState<ParticipantRole>("PARTICIPANT")

  const excluded = new Set(existingParticipantIds)
  const candidates = (users?.data ?? []).filter((u) => !excluded.has(u.id))

  async function handleAdd() {
    if (!profileId) {
      toast.error("Select a person to add")
      return
    }
    try {
      await addParticipant.mutateAsync({ meetingId, input: { profileId, role } })
      toast.success("Participant added — invite email isn't wired up yet, they'll see this meeting once they check the app.")
      setProfileId("")
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
            <Label className="mb-1.5">Person</Label>
            <Select value={profileId} onValueChange={setProfileId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a person to add" />
              </SelectTrigger>
              <SelectContent>
                {candidates.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Everyone active is already on this meeting.
                  </div>
                ) : (
                  candidates.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} — {u.email}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as MeetingParticipant["role"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PARTICIPANT">Participant</SelectItem>
                <SelectItem value="CHAIR">Chair</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={addParticipant.isPending || !profileId}>
            {addParticipant.isPending && <Loader2 className="size-4 animate-spin" />}
            Add Participant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
