import { useMemo, useState } from "react"
import { ListTodo, Pencil, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CardContentSkeleton } from "@/components/shared/PageSkeletons"
import { AddAgendaItemDialog, type AgendaAssignee } from "@/components/shared/AddAgendaItemDialog"
import { useAgendaItems, useMeeting, useMeetingParticipants } from "@/hooks/useMeetings"
import { formatDateMedium } from "@/lib/format"
import type { AgendaItem } from "@/types"

export function AgendaCard({
  meetingId,
  isOrganizerOrAdmin,
  previousMeetingId,
  organizer,
}: {
  meetingId: string
  isOrganizerOrAdmin: boolean
  previousMeetingId?: string
  // Whoever booked the meeting — always eligible as an agenda owner even
  // though they aren't a row in meeting_participants themselves.
  organizer: AgendaAssignee
}) {
  const { data: agendaItems, isLoading } = useAgendaItems(meetingId)
  const { data: previousMeeting } = useMeeting(previousMeetingId)
  const { data: previousAgendaItems } = useAgendaItems(previousMeetingId)
  const { data: participants } = useMeetingParticipants(meetingId)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<AgendaItem | undefined>(undefined)

  // Only people actually attending can be handed an agenda topic — assigning
  // it to someone outside the meeting left them owning something they'd
  // never even hear discussed.
  const eligibleAssignees = useMemo<AgendaAssignee[]>(() => {
    const seen = new Set<string>([organizer.id])
    const list: AgendaAssignee[] = [organizer]
    for (const p of participants ?? []) {
      if (p.profileId && !seen.has(p.profileId)) {
        seen.add(p.profileId)
        list.push({ id: p.profileId, name: p.name, email: p.email })
      }
    }
    return list
  }, [organizer, participants])

  function openEdit(item: AgendaItem) {
    setEditingItem(item)
    setShowAddDialog(true)
  }

  function openAdd() {
    setEditingItem(undefined)
    setShowAddDialog(true)
  }

  return (
    <>
      {!!previousAgendaItems?.length && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="size-4 text-muted-foreground" />
              Agenda History
              <span className="font-normal text-muted-foreground">
                — from &quot;{previousMeeting?.title ?? previousMeeting?.purpose}&quot;
                {previousMeeting?.date && ` · ${formatDateMedium(previousMeeting.date)}`}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {previousAgendaItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{item.topic}</p>
                  {item.ownerName && <p className="text-xs text-muted-foreground">Owner: {item.ownerName}</p>}
                </div>
                <span className="text-xs text-muted-foreground">{item.allottedMinutes} min</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="size-4 text-muted-foreground" />
              Agenda
            </CardTitle>
            {isOrganizerOrAdmin && (
              <Button variant="outline" size="sm" onClick={openAdd}>
                <Plus className="size-4" />
                Add Agenda Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <CardContentSkeleton lines={3} />
          ) : !agendaItems || agendaItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No agenda items added yet.</p>
          ) : (
            agendaItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{item.topic}</p>
                  {item.ownerName && <p className="text-xs text-muted-foreground">Owner: {item.ownerName}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{item.allottedMinutes} min</span>
                  {isOrganizerOrAdmin && (
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(item)}>
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>

        {isOrganizerOrAdmin && (
          <AddAgendaItemDialog
            meetingId={meetingId}
            open={showAddDialog}
            onOpenChange={setShowAddDialog}
            agendaItem={editingItem}
            eligibleAssignees={eligibleAssignees}
          />
        )}
      </Card>
    </>
  )
}
