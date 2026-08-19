import { toMinutes } from "@/lib/business-hours"
import { bookingDisplayStatus } from "@/lib/booking-buckets"
import { formatDateWeekday, formatTime12h } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Booking } from "@/types"

const HOUR_HEIGHT_PX = 64

interface BookingCalendarGridProps {
  days: string[] // YYYY-MM-DD, 1 entry for day view, 7 for week view
  bookings: Booking[]
  startHour?: number
  endHour?: number
  onBookingClick?: (booking: Booking) => void
  emptyHint?: string
}

function statusClasses(booking: Booking) {
  const status = bookingDisplayStatus(booking)
  if (status === "CANCELLED") {
    return "border-muted-foreground/30 bg-muted text-muted-foreground line-through"
  }
  if (status === "PENDING") {
    return "border-warning/40 bg-warning/15 text-warning-foreground"
  }
  return "border-primary/30 bg-primary/10 text-primary"
}

export function BookingCalendarGrid({
  days,
  bookings,
  startHour = 8,
  endHour = 18,
  onBookingClick,
  emptyHint,
}: BookingCalendarGridProps) {
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const todayStr = new Date().toISOString().slice(0, 10)
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
  const gridStartMinutes = startHour * 60

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <div
        className="grid min-w-[640px]"
        style={{ gridTemplateColumns: `64px repeat(${days.length}, 1fr)` }}
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
          const dayBookings = bookings.filter((b) => b.date === day)
          return (
            <div key={day} className="relative border-r last:border-r-0">
              {hours.map((h) => (
                <div key={h} className="border-b last:border-b-0" style={{ height: HOUR_HEIGHT_PX }} />
              ))}

              {day === todayStr && nowMinutes >= gridStartMinutes && nowMinutes <= endHour * 60 && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-destructive"
                  style={{ top: ((nowMinutes - gridStartMinutes) / 60) * HOUR_HEIGHT_PX }}
                />
              )}

              {dayBookings.map((booking) => {
                const start = toMinutes(booking.startTime)
                const end = toMinutes(booking.endTime)
                const top = ((start - gridStartMinutes) / 60) * HOUR_HEIGHT_PX
                const height = Math.max(((end - start) / 60) * HOUR_HEIGHT_PX - 2, 20)
                return (
                  <button
                    key={booking.id}
                    onClick={() => onBookingClick?.(booking)}
                    className={cn(
                      "absolute inset-x-1 z-[5] overflow-hidden rounded-md border px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition-transform hover:z-20 hover:scale-[1.02]",
                      statusClasses(booking)
                    )}
                    style={{ top, height }}
                  >
                    <p className="truncate font-semibold">{booking.roomName}</p>
                    <p className="truncate">{formatTime12h(booking.startTime)}</p>
                    <p className="truncate">{booking.bookedBy.name}</p>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
      {bookings.length === 0 && emptyHint && (
        <p className="border-t p-4 text-center text-sm text-muted-foreground">{emptyHint}</p>
      )}
    </div>
  )
}
