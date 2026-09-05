import { useNavigate, useSearchParams } from "react-router-dom"
import { CalendarRange, Eye, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DateTimePicker } from "@/components/shared/DateTimePicker"
import { SearchInput } from "@/components/shared/SearchInput"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Pagination } from "@/components/shared/Pagination"
import { EmptyState } from "@/components/shared/EmptyState"
import { MeetingBucketFilter } from "@/components/shared/MeetingBucketFilter"
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { useMeetings } from "@/hooks/useMeetings"
import { useRooms } from "@/hooks/useRooms"
import { followUpLabel, meetingDisplayStatus, typeDeptLabel } from "@/lib/meeting-buckets"
import { formatDateMedium, formatTimeRange, initials } from "@/lib/format"
import type { MeetingBucket } from "@/types"

export function MeetingsManagementPage() {
  const navigate = useNavigate()
  // Backed by the URL, not useState: this list is always reached by
  // navigating into a meeting and back, which remounts the page and would
  // otherwise silently reset every filter and the page/page-size you'd
  // picked back to their defaults — confirmed live as a real, reported
  // annoyance on the user-side equivalent of this same page (picking 25
  // rows per page, opening a meeting, coming back to find it quietly
  // reverted to 10). The URL survives that remount for free.
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get("search") ?? ""
  const roomId = searchParams.get("roomId") ?? "all"
  const dateFrom = searchParams.get("dateFrom") ?? ""
  const dateTo = searchParams.get("dateTo") ?? ""
  const timeFrom = searchParams.get("timeFrom") ?? ""
  const timeTo = searchParams.get("timeTo") ?? ""
  const bucket = (searchParams.get("bucket") as MeetingBucket | null) ?? "all"
  const page = Number(searchParams.get("page") ?? "1")
  const pageSize = Number(searchParams.get("pageSize") ?? "10")
  const debouncedSearch = useDebouncedValue(search)

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

  const { data: rooms } = useRooms({ pageSize: 100 })
  const { data, isLoading } = useMeetings({
    search: debouncedSearch,
    roomId: roomId === "all" ? undefined : roomId,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    timeFrom: timeFrom || undefined,
    timeTo: timeTo || undefined,
    bucket,
    page,
    pageSize,
  })

  function handlePageSizeChange(size: number) {
    updateParams({ pageSize: String(size), page: "1" })
  }

  const hasActiveFilters =
    search !== "" ||
    roomId !== "all" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    timeFrom !== "" ||
    timeTo !== "" ||
    bucket !== "all"

  function clearFilters() {
    setSearchParams({}, { replace: true })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Meetings</h1>
        <Button onClick={() => navigate("/admin/meetings/new")}>
          <Plus className="size-4" />
          New Meeting
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => updateParams({ search: v, page: "1" })}
          placeholder="Search meetings..."
          className="w-full max-w-xs"
        />
        <Select
          value={roomId}
          onValueChange={(v) => updateParams({ roomId: v, page: "1" })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Rooms" />
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <DateTimePicker
            date={dateFrom}
            time={timeFrom}
            onDateChange={(v) => updateParams({ dateFrom: v, page: "1" })}
            onTimeChange={(v) => updateParams({ timeFrom: v, page: "1" })}
            placeholder="From"
            className="w-[170px]"
          />
          <span>to</span>
          <DateTimePicker
            date={dateTo}
            time={timeTo}
            onDateChange={(v) => updateParams({ dateTo: v, page: "1" })}
            onTimeChange={(v) => updateParams({ timeTo: v, page: "1" })}
            placeholder="To"
            className="w-[170px]"
          />
        </div>
        <MeetingBucketFilter
          value={bucket}
          onChange={(v) => updateParams({ bucket: v, page: "1" })}
        />
        {hasActiveFilters && (
          <Button type="button" variant="ghost" onClick={clearFilters}>
            <X className="size-4" />
            Clear Filters
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card">
        {isLoading ? (
          <Table className="hidden table-fixed md:table">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[28%]">Title</TableHead>
                <TableHead className="w-[20%]">Date & Time</TableHead>
                <TableHead className="w-[18%]">Organizer</TableHead>
                <TableHead className="w-[16%]">Status</TableHead>
                <TableHead className="w-[14%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableSkeleton columns={["textStack", "textStack", "avatarText", "badge", "actions"]} />
          </Table>
        ) : data?.data.length === 0 ? (
          <EmptyState icon={CalendarRange} title="No meetings found" description="Try adjusting your filters." />
        ) : (
          <>
            <Table className="hidden table-fixed md:table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[28%]">Title</TableHead>
                  <TableHead className="w-[20%]">Date & Time</TableHead>
                  <TableHead className="w-[18%]">Organizer</TableHead>
                  <TableHead className="w-[16%]">Status</TableHead>
                  <TableHead className="w-[14%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.map((meeting) => (
                  <TableRow
                    key={meeting.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/meetings/${meeting.id}`)}
                  >
                    <TableCell className="whitespace-normal">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{meeting.title ?? meeting.purpose}</p>
                        {followUpLabel(meeting.followUpNumber) && (
                          <StatusBadge
                            status="FOLLOWUP"
                            tone="neutral"
                            label={followUpLabel(meeting.followUpNumber)!}
                          />
                        )}
                        {meeting.organizerTransferredAt && (
                          <StatusBadge status="TRANSFERRED" tone="info" label="Transferred" />
                        )}
                        {meeting.rescheduleDeclined && (
                          <StatusBadge status="DECLINED" tone="destructive" label="Reschedule Declined" />
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {typeDeptLabel(meeting.type, meeting.department)}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <p>{formatDateMedium(meeting.date)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatTimeRange(meeting.startTime, meeting.endTime)}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar className="size-7 shrink-0">
                          <AvatarFallback className="bg-accent text-xs text-accent-foreground">
                            {initials(meeting.bookedBy.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{meeting.bookedBy.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <StatusBadge status={meetingDisplayStatus(meeting)} />
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => navigate(`/admin/meetings/${meeting.id}`)}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="divide-y md:hidden">
              {data?.data.map((meeting) => (
                <button
                  key={meeting.id}
                  type="button"
                  onClick={() => navigate(`/admin/meetings/${meeting.id}`)}
                  className="flex w-full flex-col gap-2 p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-medium">{meeting.title ?? meeting.purpose}</p>
                    <StatusBadge status={meetingDisplayStatus(meeting)} className="shrink-0" />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {followUpLabel(meeting.followUpNumber) && (
                      <StatusBadge
                        status="FOLLOWUP"
                        tone="neutral"
                        label={followUpLabel(meeting.followUpNumber)!}
                      />
                    )}
                    {meeting.organizerTransferredAt && (
                      <StatusBadge status="TRANSFERRED" tone="info" label="Transferred" />
                    )}
                    {meeting.rescheduleDeclined && (
                      <StatusBadge status="DECLINED" tone="destructive" label="Reschedule Declined" />
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {typeDeptLabel(meeting.type, meeting.department)}
                  </p>
                  <p className="text-sm">
                    {formatDateMedium(meeting.date)}
                    <span className="text-muted-foreground"> · {formatTimeRange(meeting.startTime, meeting.endTime)}</span>
                  </p>
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar className="size-6 shrink-0">
                      <AvatarFallback className="bg-accent text-[10px] text-accent-foreground">
                        {initials(meeting.bookedBy.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm text-muted-foreground">{meeting.bookedBy.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
        {data && (
          <div className="p-4">
            <Pagination
              pagination={data.pagination}
              onPageChange={(p) => updateParams({ page: String(p) })}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}
