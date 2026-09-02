import { useState } from "react"
import { ChevronRight, History } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useMeetingHistory } from "@/hooks/useMeetings"
import { formatDateShort, formatTimeRange } from "@/lib/format"
import { cn } from "@/lib/utils"

function slotLabel(roomName: string, roomLocation: string, date: string, start: string, end: string) {
  return `${roomName} (${roomLocation}) · ${formatDateShort(date)} · ${formatTimeRange(start, end)}`
}

export function MeetingHistoryList({ meetingId }: { meetingId: string }) {
  const { data: history, isLoading } = useMeetingHistory(meetingId)
  const [showHistory, setShowHistory] = useState(false)

  if (isLoading) {
    return (
      <div className="flex h-[52px] items-center rounded-xl border bg-card px-6">
        <Skeleton className="h-4 w-44" />
      </div>
    )
  }

  if (!history || history.length === 0) {
    return null
  }

  return (
    <Card className="self-start">
      <CardHeader>
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <CardTitle className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            Reschedule History ({history.length})
          </CardTitle>
          <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", showHistory && "rotate-90")} />
        </button>
      </CardHeader>
      {showHistory && (
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
      )}
    </Card>
  )
}
