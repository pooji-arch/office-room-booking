import { History, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useBookingHistory } from "@/hooks/useBookings"
import { formatDateShort, formatTimeRange } from "@/lib/format"

function slotLabel(roomName: string, roomLocation: string, date: string, start: string, end: string) {
  return `${roomName} (${roomLocation}) · ${formatDateShort(date)} · ${formatTimeRange(start, end)}`
}

export function BookingHistoryList({ bookingId }: { bookingId: string }) {
  const { data: history, isLoading } = useBookingHistory(bookingId)

  if (isLoading) {
    return <Loader2 className="size-5 animate-spin text-primary" />
  }

  if (!history || history.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4 text-muted-foreground" />
          Reschedule History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {history.map((entry) => (
          <div key={entry.id} className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="text-xs text-muted-foreground">
              {entry.changedByName}
              {entry.changedByIsAdmin ? " (Admin)" : ""} · {new Date(entry.changedAt).toLocaleString()}
            </p>
            <p className="mt-1.5">
              <span className="text-muted-foreground line-through">
                {slotLabel(
                  entry.previousRoomName,
                  entry.previousRoomLocation,
                  entry.previousDate,
                  entry.previousStartTime,
                  entry.previousEndTime
                )}
              </span>
            </p>
            <p className="font-medium">
              {slotLabel(
                entry.newRoomName,
                entry.newRoomLocation,
                entry.newDate,
                entry.newStartTime,
                entry.newEndTime
              )}
            </p>
            {entry.reason && (
              <p className="mt-1.5 text-xs text-muted-foreground">Reason: {entry.reason}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
