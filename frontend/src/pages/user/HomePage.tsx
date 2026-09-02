import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { DoorOpen, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/shared/DatePicker"
import { TimeSelect } from "@/components/shared/TimeSelect"
import { EmptyState } from "@/components/shared/EmptyState"
import { RoomCard } from "@/components/shared/RoomCard"
import { useRooms } from "@/hooks/useRooms"
import { useMeetings } from "@/hooks/useMeetings"

interface Filters {
  search: string
  date: string
  time: string
}

const defaultFilters: Filters = { search: "", date: "", time: "" }

export function HomePage() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<Filters>(defaultFilters)
  const [applied, setApplied] = useState<Filters>(defaultFilters)

  // Unavailable rooms are hidden entirely; Maintenance rooms still show (with
  // a badge) but can't be booked — so only the room-status filter is client
  // side here, not server side.
  const { data, isLoading } = useRooms({ search: applied.search, pageSize: 50 })

  // Date+time search previously did nothing at all — the inputs were
  // captured in state but never actually used to filter anything. Fetching
  // every meeting on the chosen date (no room filter — this app's meetings
  // SELECT RLS is already open to any authenticated user) lets us exclude
  // any room that's already booked at that exact time, client-side.
  const hasDateTimeSearch = !!applied.date && !!applied.time
  const { data: dayMeetings } = useMeetings(
    { dateFrom: applied.date, dateTo: applied.date, pageSize: 200 },
    { enabled: hasDateTimeSearch }
  )

  function isRoomBusyAtSearchedTime(roomId: string) {
    if (!hasDateTimeSearch) return false
    return (dayMeetings?.data ?? []).some(
      (m) =>
        m.roomId === roomId &&
        m.status !== "CANCELLED" &&
        m.startTime <= applied.time &&
        applied.time < m.endTime
    )
  }

  const rooms = (data?.data ?? []).filter(
    (r) => r.status !== "UNAVAILABLE" && !isRoomBusyAtSearchedTime(r.id)
  )
  function isDefault(f: Filters) {
    return f.search === "" && f.date === "" && f.time === ""
  }
  const hasActiveFilters = !isDefault(draft) || !isDefault(applied)

  function clearFilters() {
    setDraft(defaultFilters)
    setApplied(defaultFilters)
  }

  function handleSearch() {
    setApplied(draft)
  }

  function viewDetails(roomId: string) {
    const params = new URLSearchParams()
    if (applied.date) params.set("date", applied.date)
    if (applied.time) params.set("time", applied.time)
    const qs = params.toString()
    navigate(`/rooms/${roomId}${qs ? `?${qs}` : ""}`)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Find a Room</h1>

      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={draft.search}
            onChange={(e) => setDraft((f) => ({ ...f, search: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search rooms by name or location..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Date</p>
            <div className="relative">
              <DatePicker
                value={draft.date}
                onChange={(v) => setDraft((f) => ({ ...f, date: v }))}
                placeholder="Any date"
                className="w-[150px]"
              />
              {draft.date && (
                <button
                  type="button"
                  aria-label="Clear date"
                  onClick={() => setDraft((f) => ({ ...f, date: "" }))}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Time</p>
            {draft.time ? (
              <div className="flex items-center gap-1">
                <TimeSelect value={draft.time} onChange={(v) => setDraft((f) => ({ ...f, time: v }))} />
                <button
                  type="button"
                  aria-label="Clear time"
                  onClick={() => setDraft((f) => ({ ...f, time: "" }))}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-[150px] justify-start font-normal text-muted-foreground"
                onClick={() => setDraft((f) => ({ ...f, time: "09:00" }))}
              >
                Any time
              </Button>
            )}
          </div>
          <Button onClick={handleSearch}>
            <Search className="size-4" />
            Search
          </Button>
          {hasActiveFilters && (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              <X className="size-4" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Available Rooms {data && `(${rooms.length})`}
        </h2>
        {!isLoading && rooms.length === 0 ? (
          <EmptyState
            icon={DoorOpen}
            title="No rooms match your search"
            description="Try a different search term or date/time."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} onViewDetails={() => viewDetails(room.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
