import { useState } from "react"
import { toast } from "sonner"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
import { cn } from "@/lib/utils"
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
  const [personPickerOpen, setPersonPickerOpen] = useState(false)

  const excluded = new Set(existingParticipantIds)
  const candidates = (users?.data ?? []).filter((u) => !excluded.has(u.id))
  const selected = candidates.find((u) => u.id === profileId)

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
            {/* A searchable combobox, not a plain dropdown — scrolling
                through every active user to find one specific name doesn't
                scale once the org has more than a handful of people. */}
            <Popover open={personPickerOpen} onOpenChange={setPersonPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={personPickerOpen}
                  className="w-full justify-between font-normal"
                  disabled={candidates.length === 0}
                >
                  <span className="truncate">
                    {selected
                      ? `${selected.name} — ${selected.email}`
                      : candidates.length === 0
                        ? "Everyone active is already on this meeting"
                        : "Select a person to add"}
                  </span>
                  <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search by name or email..." />
                  <CommandList>
                    <CommandEmpty>No one matches that search.</CommandEmpty>
                    <CommandGroup>
                      {candidates.map((u) => (
                        <CommandItem
                          key={u.id}
                          value={`${u.name} ${u.email}`}
                          onSelect={() => {
                            setProfileId(u.id)
                            setPersonPickerOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "size-4",
                              profileId === u.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="truncate">
                            {u.name} — {u.email}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
