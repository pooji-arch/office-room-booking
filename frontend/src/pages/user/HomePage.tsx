import { useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ChevronDown, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { RoomsWeekTimeline } from "@/components/shared/RoomsWeekTimeline"
import { MeetingDetailsDialogBody } from "@/components/shared/MeetingDetailsDialogBody"
import { BookASpotDialog } from "@/components/shared/BookASpotDialog"
import { useActionItems, useMeetingParticipants, useMeetings } from "@/hooks/useMeetings"
import { useRooms } from "@/hooks/useRooms"
import { useAuth } from "@/hooks/useAuth"
import { getWeekDays } from "@/lib/week"
import { MEETING_TYPE_OPTIONS } from "@/lib/meeting-buckets"
import { formatDateShort, parseDateInputValue, toDateInputValue } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { MeetingType } from "@/types"

const ALL_TYPES = MEETING_TYPE_OPTIONS.map((o) => o.value)

const LEGEND_ITEMS = [
  { label: "Confirmed", dot: "bg-success shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-success/60" },
  { label: "Completed", dot: "bg-primary shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-primary/60" },
  { label: "Rescheduled", dot: "bg-warning shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-warning/60" },
  { label: "Pending Approval", dot: "border-2 border-dashed border-chart-6" },
  { label: "Cancelled", dot: "bg-destructive shadow-[0_0_5px_0_var(--tw-shadow-color)] shadow-destructive/60" },
  { label: "Declined", dot: "border-2 border-dotted border-destructive" },
] as const

export function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  // Same URL-backed pattern as the admin Calendar page — clicking a meeting
  // navigates away to its details page and back, which remounts this page;
  // keeping the browsed date/view/room/filter in the URL means "Back"
  // actually lands you where you were.
  const [searchParams, setSearchParams] = useSearchParams()
  const view = (searchParams.get("view") as "week" | "day" | null) ?? "week"
  const roomId = searchParams.get("roomId") ?? "all"
  const approvalFilter = (searchParams.get("approval") as "APPROVED" | "PENDING" | null) ?? "all"
  const typesParam = searchParams.get("types")
  // "none" is a real, distinct state from "no types param at all" (= every
  // type) — without this sentinel, unchecking the very last category would
  // produce an empty string, which updateParams treats as "delete this
  // param", silently snapping the filter back to "all types" the moment it
  // reached zero (looked like the last checkbox refused to uncheck).
  const selectedTypes = (
    typesParam === "none" ? [] : typesParam ? typesParam.split(",") : ALL_TYPES
  ) as MeetingType[]
  const onlyMine = searchParams.get("onlyMine") === "1"
  const dateStr = searchParams.get("date") ?? toDateInputValue(new Date())
  const selectedDate = parseDateInputValue(dateStr)
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)
  const [showBookASpot, setShowBookASpot] = useState(false)

  function updateParams(updates: Record<string, string>) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(updates)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        return next
      },
      { replace: true }
    )
  }

  function setSelectedDate(d: Date) {
    updateParams({ date: toDateInputValue(d) })
  }

  function setView(v: "week" | "day") {
    updateParams({ view: v })
  }

  function setRoomId(v: string) {
    updateParams({ roomId: v === "all" ? "" : v })
  }

  function setApprovalFilter(v: "all" | "APPROVED" | "PENDING") {
    updateParams({ approval: v === "all" ? "" : v })
  }

  function toggleType(type: MeetingType) {
    const next = selectedTypes.includes(type)
      ? selectedTypes.filter((t) => t !== type)
      : [...selectedTypes, type]
    updateParams({
      types: next.length === ALL_TYPES.length ? "" : next.length === 0 ? "none" : next.join(","),
    })
  }

  function setOnlyMine(v: boolean) {
    updateParams({ onlyMine: v ? "1" : "" })
  }

  const { data: rooms } = useRooms({ pageSize: 100 })
  const days = useMemo(
    () => (view === "week" ? getWeekDays(parseDateInputValue(dateStr)) : [dateStr]),
    [dateStr, view]
  )

  const { data } = useMeetings({
    roomId: roomId === "all" ? undefined : roomId,
    dateFrom: days[0],
    dateTo: days[days.length - 1],
    pageSize: 200,
  })
  const visibleMeetings = (data?.data ?? []).filter((m) => {
    if (approvalFilter !== "all" && m.approvalStatus !== approvalFilter) return false
    if (!selectedTypes.includes(m.type)) return false
    if (onlyMine && m.bookedBy.id !== user?.id) return false
    return true
  })

  function shift(count: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + count * (view === "week" ? 7 : 1))
    setSelectedDate(d)
  }

  const rangeLabel =
    view === "week"
      ? `${formatDateShort(days[0])} – ${formatDateShort(days[days.length - 1])}`
      : formatDateShort(days[0])

  const categoriesLabel =
    selectedTypes.length === ALL_TYPES.length
      ? "All Categories"
      : selectedTypes.length === 0
        ? "No Categories"
        : selectedTypes.length === 1
          ? MEETING_TYPE_OPTIONS.find((o) => o.value === selectedTypes[0])?.label
          : `${selectedTypes.length} selected`

  // Same three-way access check RoomCalendarViewPage/UserMeetingDetailsPage
  // use — this calendar shows every meeting across every room, most of
  // which belong to other people, so "View Full Details" only appears when
  // it would actually work.
  const selectedMeeting = data?.data.find((m) => m.id === selectedMeetingId)
  const { data: selectedParticipants } = useMeetingParticipants(selectedMeetingId ?? undefined)
  const { data: selectedActionItems } = useActionItems(selectedMeetingId ?? undefined)
  const selectedMeetingBelongsToUser =
    !!selectedMeeting &&
    (selectedMeeting.bookedBy.id === user?.id ||
      !!selectedParticipants?.some((p) => p.profileId === user?.id) ||
      !!selectedActionItems?.some((item) => item.ownerId === user?.id))

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Calendar</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("size-2.5 shrink-0 rounded-full", item.dot)} />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
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
            <CardContent className="space-y-3 pt-4">
              <p className="text-sm font-medium">Room</p>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rooms</SelectItem>
                  {rooms?.data.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <p className="pt-2 text-sm font-medium">View</p>
              <Select value={view} onValueChange={(v) => setView(v as "week" | "day")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                </SelectContent>
              </Select>

              <p className="pt-2 text-sm font-medium">Categories</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    {categoriesLabel}
                    <ChevronDown className="size-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]" align="start">
                  {MEETING_TYPE_OPTIONS.map((opt) => (
                    <DropdownMenuCheckboxItem
                      key={opt.value}
                      checked={selectedTypes.includes(opt.value)}
                      onCheckedChange={() => toggleType(opt.value)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {opt.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <p className="pt-2 text-sm font-medium">Booking Status</p>
              <div className="flex rounded-lg border p-0.5">
                {(["all", "APPROVED", "PENDING"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setApprovalFilter(v)}
                    className={cn(
                      "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                      approvalFilter === v
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {v === "all" ? "All" : v === "APPROVED" ? "Approved" : "Pending"}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
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
            <Label className="flex items-center gap-2 text-sm font-medium">
              Only mine
              <Switch checked={onlyMine} onCheckedChange={setOnlyMine} />
            </Label>
          </div>

          <RoomsWeekTimeline
            rooms={roomId === "all" ? (rooms?.data ?? []) : (rooms?.data ?? []).filter((r) => r.id === roomId)}
            days={days}
            meetings={visibleMeetings}
            onMeetingClick={(m) => setSelectedMeetingId(m.id)}
            emptyHint="No meetings in this range."
          />
        </div>
      </div>

      <Dialog open={!!selectedMeetingId} onOpenChange={(o) => !o && setSelectedMeetingId(null)}>
        <DialogContent className="sm:max-w-xl">
          {selectedMeetingId && (
            <MeetingDetailsDialogBody
              key={selectedMeetingId}
              meetingId={selectedMeetingId}
              onViewDetails={
                selectedMeetingBelongsToUser ? () => navigate(`/meetings/${selectedMeetingId}`) : undefined
              }
            />
          )}
        </DialogContent>
      </Dialog>

      <Button
        size="icon"
        className="fixed right-6 bottom-6 z-30 size-14 rounded-full shadow-lg"
        onClick={() => setShowBookASpot(true)}
        aria-label="Book a spot"
      >
        <Plus className="size-6" />
      </Button>

      <BookASpotDialog open={showBookASpot} onOpenChange={setShowBookASpot} initialDate={dateStr} />
    </div>
  )
}
