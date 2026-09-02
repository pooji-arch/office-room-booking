import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Check, ChevronsUpDown } from "lucide-react"
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { useActiveUsers } from "@/hooks/useUsers"
import { useTransferOrganizer } from "@/hooks/useMeetings"
import { cn } from "@/lib/utils"

// Organizer-initiated hand-off of their own meeting to someone else — the
// self-service counterpart to admin's "Assign To" field on Edit &
// Reassign, but scoped to just the organizer (no room/time/reason), since
// that's the one thing a plain organizer is now allowed to change about
// their own booking (migration 0023).
export function TransferOrganizerDialog({
  meetingId,
  currentOrganizerId,
  open,
  onOpenChange,
}: {
  meetingId: string
  currentOrganizerId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const { data: users } = useActiveUsers()
  const transferOrganizer = useTransferOrganizer()
  const [profileId, setProfileId] = useState("")
  const [personPickerOpen, setPersonPickerOpen] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const candidates = (users?.data ?? []).filter((u) => u.id !== currentOrganizerId)
  const selected = candidates.find((u) => u.id === profileId)

  function close() {
    setProfileId("")
    setShowConfirm(false)
    onOpenChange(false)
  }

  async function handleTransfer() {
    try {
      await transferOrganizer.mutateAsync({ id: meetingId, newOrganizerId: profileId })
      toast.success(`Meeting transferred to ${selected?.name ?? "the new organizer"}`)
      close()
      // The current user is no longer this meeting's organizer once the
      // transfer lands — if they're not also a participant, the details
      // page would otherwise immediately show "Meeting not found."
      navigate("/meetings", { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to transfer meeting")
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Organizer</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pick who this meeting should belong to instead. You'll no longer be its organizer once
              transferred.
            </p>
            <div>
              <Label className="mb-1.5">New Organizer</Label>
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
                          ? "No other active users to transfer to"
                          : "Select a person"}
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
                              className={cn("size-4", profileId === u.id ? "opacity-100" : "opacity-0")}
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button disabled={!profileId} onClick={() => setShowConfirm(true)}>
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Transfer this meeting?"
        description={`${selected?.name ?? "This person"} will become the organizer. You will lose organizer access to this meeting.`}
        confirmLabel="Transfer"
        destructive
        isLoading={transferOrganizer.isPending}
        onConfirm={handleTransfer}
      />
    </>
  )
}
