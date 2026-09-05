import { toMinutes } from "@/lib/business-hours"
import { meetingDisplayStatus } from "@/lib/meeting-buckets"
import { formatDateWeekday, formatTime12h } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Meeting } from "@/types"

const HOUR_HEIGHT_PX = 64

interface MeetingCalendarGridProps {
  days: string[] // YYYY-MM-DD, 1 entry for day view, 7 for week view
  meetings: Meeting[]
  startHour?: number
  endHour?: number
  onMeetingClick?: (meeting: Meeting) => void
  emptyHint?: string
  currentUserId?: string // when set, that user's own meetings show "You" instead of their name
}

function statusClasses(meeting: Meeting) {
  const status = meetingDisplayStatus(meeting)
  switch (status) {
    case "CANCELLED":
      return "border-destructive/40 bg-destructive/15 text-destructive line-through"
    case "COMPLETED":
      return "border-primary/30 bg-primary/10 text-primary"
    case "RESCHEDULED":
      return "border-warning/40 bg-warning/15 text-warning-foreground"
    case "PENDING_APPROVAL":
      return "border-chart-6/40 bg-chart-6/15 text-chart-6 border-dashed"
    case "CONFIRMED":
    default:
      return "border-success/40 bg-success/15 text-success"
  }
}

export function MeetingCalendarGrid({
  days,
  meetings,
  startHour = 8,
  endHour = 18,
  onMeetingClick,
  emptyHint,
  currentUserId,
}: MeetingCalendarGridProps) {
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const todayStr = new Date().toISOString().slice(0, 10)
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
  const gridStartMinutes = startHour * 60

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div
        className="grid"
        style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {/* Header row */}
        <div className="sticky top-0 z-10 border-b border-r bg-card" />
        {days.map((day) => (
          <div
            key={day}
            className={cn(
              "sticky top-0 z-10 border-b border-r bg-card px-2 py-2.5 text-center text-sm font-medium last:border-r-0",
              day === todayStr && "bg-accent text-accent-foreground"
            )}
          >
            {formatDateWeekday(day)}
          </div>
        ))}

        {/* Time column */}
        <div className="border-r">
          {hours.map((h) => (
            <div
              key={h}
              className="flex items-start justify-end border-b px-2 pt-0 text-xs text-muted-foreground last:border-b-0"
              style={{ height: HOUR_HEIGHT_PX }}
            >
              <span className="-translate-y-2">{formatTime12h(`${String(h).padStart(2, "0")}:00`)}</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => {
          const dayMeetings = meetings.filter((m) => m.date === day)
          return (
            <div key={day} className="relative border-r last:border-r-0">
              {hours.map((h) => (
                <div
                  key={h}
                  className="border-b transition-colors last:border-b-0 hover:bg-muted/40"
                  style={{ height: HOUR_HEIGHT_PX }}
                />
              ))}

              {day === todayStr && nowMinutes >= gridStartMinutes && nowMinutes <= endHour * 60 && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-destructive"
                  style={{ top: ((nowMinutes - gridStartMinutes) / 60) * HOUR_HEIGHT_PX }}
                />
              )}

              {dayMeetings.map((meeting) => {
                const start = toMinutes(meeting.startTime)
                const end = toMinutes(meeting.endTime)
                const top = ((start - gridStartMinutes) / 60) * HOUR_HEIGHT_PX
                const height = Math.max(((end - start) / 60) * HOUR_HEIGHT_PX - 2, 20)
                return (
                  <button
                    key={meeting.id}
                    onClick={() => onMeetingClick?.(meeting)}
                    className={cn(
                      "absolute inset-x-1 z-[5] overflow-hidden rounded-md border px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition-all hover:z-20 hover:scale-[1.02] hover:shadow-md",
                      statusClasses(meeting)
                    )}
                    style={{ top, height }}
                  >
                    <p className="truncate font-semibold">{meeting.roomName}</p>
                    <p className="truncate">{formatTime12h(meeting.startTime)}</p>
                    <p className="truncate">
                      {meeting.bookedBy.id === currentUserId ? "You" : meeting.bookedBy.name}
                    </p>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
      {meetings.length === 0 && emptyHint && (
        <p className="border-t p-4 text-center text-sm text-muted-foreground">{emptyHint}</p>
      )}
    </div>
  )
}
