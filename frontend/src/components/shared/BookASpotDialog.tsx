import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RoomImagePlaceholder } from "@/components/shared/RoomImagePlaceholder"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { useRooms } from "@/hooks/useRooms"
import { getWeekDays } from "@/lib/week"
import { formatDateShort, parseDateInputValue, toDateInputValue } from "@/lib/format"
import { cn } from "@/lib/utils"
import { DoorOpen } from "lucide-react"

interface BookASpotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialDate: string
}

// Quick-book entry point off the Home calendar's floating "+" — pick a day
// from a week strip, then a room, and land straight on that room's existing
// booking form (RoomDetailsPage) with the date pre-filled.
export function BookASpotDialog({ open, onOpenChange, initialDate }: BookASpotDialogProps) {
  const navigate = useNavigate()
  const [anchorDate, setAnchorDate] = useState(initialDate)
  const [selectedDay, setSelectedDay] = useState(initialDate)
  const { data: rooms } = useRooms({ pageSize: 100 })

  const days = useMemo(() => getWeekDays(parseDateInputValue(anchorDate)), [anchorDate])
  const bookableRooms = (rooms?.data ?? []).filter((r) => r.status !== "UNAVAILABLE")

  function shiftWeek(count: number) {
    const d = parseDateInputValue(anchorDate)
    d.setDate(d.getDate() + count * 7)
    const next = toDateInputValue(d)
    setAnchorDate(next)
  }

  function handleRoomClick(roomId: string) {
    onOpenChange(false)
    navigate(`/rooms/${roomId}?date=${selectedDay}`)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (o) {
          setAnchorDate(initialDate)
          setSelectedDay(initialDate)
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book a spot</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon-sm" onClick={() => shiftWeek(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <p className="text-sm font-medium">
            {formatDateShort(days[0])} – {formatDateShort(days[6])}
          </p>
          <Button variant="ghost" size="icon-sm" onClick={() => shiftWeek(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const d = parseDateInputValue(day)
            const isSelected = day === selectedDay
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg py-2 text-xs transition-colors",
                  isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                <span className={cn("uppercase", !isSelected && "text-muted-foreground")}>
                  {d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)}
                </span>
                <span className="text-base font-semibold">{d.getDate()}</span>
              </button>
            )
          })}
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {bookableRooms.length === 0 ? (
            <EmptyState icon={DoorOpen} title="No rooms available" description="There are no bookable rooms right now." />
          ) : (
            bookableRooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => handleRoomClick(room.id)}
                className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/50"
              >
                {room.imageUrl ? (
                  <img
                    src={room.imageUrl}
                    alt={room.name}
                    className="size-14 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <RoomImagePlaceholder seed={room.id} className="size-14 shrink-0 rounded-lg" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{room.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {room.location} · {room.capacity} seats
                  </p>
                  <StatusBadge status={room.status} className="mt-1" />
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
