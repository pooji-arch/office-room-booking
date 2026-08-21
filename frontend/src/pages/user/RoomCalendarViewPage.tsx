import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { BookingCalendarGrid } from "@/components/shared/BookingCalendarGrid"
import { BookingDetailsDialogBody } from "@/components/shared/BookingDetailsDialogBody"
import { useBookings } from "@/hooks/useBookings"
import { useRoom } from "@/hooks/useRooms"
import { useAuth } from "@/hooks/useAuth"
import { getWeekDays } from "@/lib/week"
import { formatDateShort, toDateInputValue } from "@/lib/format"
import type { Booking } from "@/types"

export function RoomCalendarViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<"week" | "day">("week")
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)

  const { data: room, isLoading: isLoadingRoom } = useRoom(id)
  const days = useMemo(
    () => (view === "week" ? getWeekDays(selectedDate) : [toDateInputValue(selectedDate)]),
    [selectedDate, view]
  )

  const { data } = useBookings({
    roomId: id,
    dateFrom: days[0],
    dateTo: days[days.length - 1],
    pageSize: 200,
  })

  function shift(count: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + count * (view === "week" ? 7 : 1))
    setSelectedDate(d)
  }

  function handleBookingClick(booking: Booking) {
    setSelectedBookingId(booking.id)
  }

  const rangeLabel =
    view === "week"
      ? `${formatDateShort(days[0])} – ${formatDateShort(days[days.length - 1])}`
      : formatDateShort(days[0])

  if (isLoadingRoom || !room) {
    return <Loader2 className="size-6 animate-spin text-primary" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate(`/rooms/${id}`)}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{room.name} · Calendar</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <Card className="py-2">
            <CardContent className="px-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                className="w-full"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1.5 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-success" /> Confirmed
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-primary" /> Completed
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-warning" /> Rescheduled
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-muted-foreground/50" /> Cancelled
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" onClick={() => shift(-1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
                Today
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => shift(1)}>
                <ChevronRight className="size-4" />
              </Button>
              <span className="ml-2 text-sm font-medium">{rangeLabel}</span>
            </div>
            <div className="flex rounded-lg border p-0.5">
              {(["week", "day"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                    view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <BookingCalendarGrid
            days={days}
            bookings={data?.data ?? []}
            onBookingClick={handleBookingClick}
            emptyHint="No bookings in this range."
            currentUserId={user?.id}
          />
        </div>
      </div>

      <Dialog open={!!selectedBookingId} onOpenChange={(o) => !o && setSelectedBookingId(null)}>
        <DialogContent className="sm:max-w-xl">
          {selectedBookingId && (
            <BookingDetailsDialogBody key={selectedBookingId} bookingId={selectedBookingId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
