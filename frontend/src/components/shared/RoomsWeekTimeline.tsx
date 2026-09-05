import { Fragment } from "react"
import { RoomImagePlaceholder } from "@/components/shared/RoomImagePlaceholder"
import { EmptyState } from "@/components/shared/EmptyState"
import { meetingDisplayStatus } from "@/lib/meeting-buckets"
import { formatDateWeekday, formatTime12h, toDateInputValue } from "@/lib/format"
import { cn } from "@/lib/utils"
import { DoorOpen } from "lucide-react"
import type { Meeting, Room } from "@/types"

function statusClasses(meeting: Meeting) {
  const status = meetingDisplayStatus(meeting)
  switch (status) {
    case "CANCELLED":
      return "border-destructive/40 bg-destructive/15 text-destructive line-through"
    case "DECLINED":
      return "border-destructive/60 bg-destructive/15 text-destructive line-through border-dotted"
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

interface RoomsWeekTimelineProps {
  rooms: Room[]
  days: string[] // YYYY-MM-DD, one column per entry
  meetings: Meeting[]
  onMeetingClick?: (meeting: Meeting) => void
  emptyHint?: string
}

// A resource-timeline calendar: one row per room, one column per day, each
// cell stacking that room's meetings for that day as small cards — unlike
// MeetingCalendarGrid (hour-by-hour, single or all rooms mixed together),
// this is built specifically for "glance across every room at once" and is
// only used on the admin Calendar page, which now doubles as the admin
// landing page.
export function RoomsWeekTimeline({ rooms, days, meetings, onMeetingClick, emptyHint }: RoomsWeekTimelineProps) {
  const todayStr = toDateInputValue(new Date())

  if (rooms.length === 0) {
    return <EmptyState icon={DoorOpen} title="No rooms yet" description="Add a room to see it here." />
  }

  return (
    <div className="w-full overflow-x-auto rounded-md border bg-card">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `minmax(120px, 180px) repeat(${days.length}, minmax(92px, 1fr))`,
          minWidth: `${120 + days.length * 92}px`,
        }}
      >
        <div className="sticky top-0 left-0 z-20 border-b border-r bg-card" />
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

        {rooms.map((room) => (
          <Fragment key={room.id}>
            <div className="sticky left-0 z-[5] flex items-center gap-2.5 border-r border-b bg-card p-2.5">
              {room.imageUrl ? (
                <img
                  src={room.imageUrl}
                  alt={room.name}
                  className="size-9 shrink-0 rounded-md object-cover"
                />
              ) : (
                <RoomImagePlaceholder seed={room.id} className="size-9 shrink-0 rounded-md" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{room.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {room.location} · {room.capacity} seats
                </p>
              </div>
            </div>
            {days.map((day) => {
              const dayMeetings = meetings
                .filter((m) => m.roomId === room.id && m.date === day)
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
              return (
                <div key={`${room.id}-${day}`} className="min-h-20 space-y-1.5 border-r border-b p-1.5 last:border-r-0">
                  {dayMeetings.map((meeting) => (
                    <button
                      key={meeting.id}
                      type="button"
                      onClick={() => onMeetingClick?.(meeting)}
                      className={cn(
                        "w-full rounded-sm border px-2 py-1.5 text-left text-[11px] leading-tight shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                        statusClasses(meeting)
                      )}
                    >
                      <p className="font-semibold">
                        {formatTime12h(meeting.startTime)}–{formatTime12h(meeting.endTime)}
                      </p>
                      <p className="break-words">{meeting.purpose}</p>
                      <p className="break-words opacity-80">{meeting.bookedBy.name}</p>
                    </button>
                  ))}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
      {meetings.length === 0 && emptyHint && (
        <p className="border-t p-4 text-center text-sm text-muted-foreground">{emptyHint}</p>
      )}
    </div>
  )
}
