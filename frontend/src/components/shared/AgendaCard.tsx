import { useState } from "react"
import { ListTodo, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CardContentSkeleton } from "@/components/shared/PageSkeletons"
import { AddAgendaItemDialog } from "@/components/shared/AddAgendaItemDialog"
import { useAgendaItems, useMeeting } from "@/hooks/useMeetings"

export function AgendaCard({
  meetingId,
  isOrganizerOrAdmin,
  previousMeetingId,
}: {
  meetingId: string
  isOrganizerOrAdmin: boolean
  previousMeetingId?: string
}) {
  const { data: agendaItems, isLoading } = useAgendaItems(meetingId)
  const { data: previousMeeting } = useMeeting(previousMeetingId)
  const { data: previousAgendaItems } = useAgendaItems(previousMeetingId)
  const [showAddDialog, setShowAddDialog] = useState(false)

  return (
    <>
      {!!previousAgendaItems?.length && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListTodo className="size-4 text-muted-foreground" />
              Agenda History
              <span className="font-normal text-muted-foreground">
                — from &quot;{previousMeeting?.title ?? previousMeeting?.purpose}&quot;
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
            <CardTitle className="flex items-center gap-2 text-base">
              <ListTodo className="size-4 text-muted-foreground" />
              Agenda
            </CardTitle>
            {isOrganizerOrAdmin && (
              <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
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
                <span className="text-xs text-muted-foreground">{item.allottedMinutes} min</span>
              </div>
            ))
          )}
        </CardContent>

        {isOrganizerOrAdmin && (
          <AddAgendaItemDialog meetingId={meetingId} open={showAddDialog} onOpenChange={setShowAddDialog} />
        )}
      </Card>
    </>
  )
}
