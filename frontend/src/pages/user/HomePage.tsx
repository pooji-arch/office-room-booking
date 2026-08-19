import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { DoorOpen, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EmptyState } from "@/components/shared/EmptyState"
import { RoomCard } from "@/components/shared/RoomCard"
import { useRooms } from "@/hooks/useRooms"
import { generateBusinessHourSlots } from "@/lib/business-hours"
import { formatTime12h } from "@/lib/format"

const CAPACITY_OPTIONS = [
  { value: "any", label: "Any Capacity" },
  { value: "2", label: "2+ people" },
  { value: "4", label: "4+ people" },
  { value: "6", label: "6+ people" },
  { value: "10", label: "10+ people" },
  { value: "20", label: "20+ people" },
]

const TIME_SLOTS = generateBusinessHourSlots()

interface Filters {
  search: string
  date: string
  time: string
  capacity: string
}

const defaultFilters: Filters = { search: "", date: "", time: "any", capacity: "any" }

export function HomePage() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<Filters>(defaultFilters)
  const [applied, setApplied] = useState<Filters>(defaultFilters)

  const { data, isLoading } = useRooms({ status: "AVAILABLE", search: applied.search, pageSize: 50 })

  const minCapacity = applied.capacity === "any" ? 0 : Number(applied.capacity)
  const rooms = (data?.data ?? []).filter((r) => r.capacity >= minCapacity)

  function handleSearch() {
    setApplied(draft)
  }

  function viewDetails(roomId: string) {
    const params = new URLSearchParams()
    if (applied.date) params.set("date", applied.date)
    if (applied.time !== "any") params.set("time", applied.time)
    const qs = params.toString()
    navigate(`/rooms/${roomId}${qs ? `?${qs}` : ""}`)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Find a Room</h1>

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
            <Input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft((f) => ({ ...f, date: e.target.value }))}
              className="w-[150px]"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Time</p>
            <Select
              value={draft.time}
              onValueChange={(v) => setDraft((f) => ({ ...f, time: v }))}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Time</SelectItem>
                {TIME_SLOTS.map((s) => (
                  <SelectItem key={s.start} value={s.start}>
                    {formatTime12h(s.start)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Capacity</p>
            <Select
              value={draft.capacity}
              onValueChange={(v) => setDraft((f) => ({ ...f, capacity: v }))}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAPACITY_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSearch}>
            <Search className="size-4" />
            Search
          </Button>
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
            description="Try a different search term or lower the capacity filter."
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
