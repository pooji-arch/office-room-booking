import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { CalendarRange, Eye, X } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { SearchInput } from "@/components/shared/SearchInput"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Pagination } from "@/components/shared/Pagination"
import { EmptyState } from "@/components/shared/EmptyState"
import { MeetingBucketFilter } from "@/components/shared/MeetingBucketFilter"
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { useMeetings } from "@/hooks/useMeetings"
import { useRooms } from "@/hooks/useRooms"
import { meetingDisplayStatus } from "@/lib/meeting-buckets"
import { formatDateMedium, formatTimeRange, initials } from "@/lib/format"
import type { MeetingBucket } from "@/types"

function typeDeptLabel(type: string, department?: string) {
  const typeLabel = type.charAt(0) + type.slice(1).toLowerCase()
  return department ? `${typeLabel} · ${department}` : typeLabel
}

export function MeetingsManagementPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [roomId, setRoomId] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [bucket, setBucket] = useState<MeetingBucket>("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const debouncedSearch = useDebouncedValue(search)

  const { data: rooms } = useRooms({ pageSize: 100 })
  const { data, isLoading } = useMeetings({
    search: debouncedSearch,
    roomId: roomId === "all" ? undefined : roomId,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    bucket,
    page,
    pageSize,
  })

  function handlePageSizeChange(size: number) {
    setPageSize(size)
    setPage(1)
  }

  const hasActiveFilters =
    search !== "" || roomId !== "all" || dateFrom !== "" || dateTo !== "" || bucket !== "all"

  function clearFilters() {
    setSearch("")
    setRoomId("all")
    setDateFrom("")
    setDateTo("")
    setBucket("all")
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Meetings</h1>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Search meetings..."
          className="w-full max-w-xs"
        />
        <Select
          value={roomId}
          onValueChange={(v) => {
            setRoomId(v)
            setPage(1)
          }}
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
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value)
              setPage(1)
            }}
            className="w-[150px]"
          />
          <span>to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value)
              setPage(1)
            }}
            className="w-[150px]"
          />
        </div>
        <MeetingBucketFilter
          value={bucket}
          onChange={(v) => {
            setBucket(v)
            setPage(1)
          }}
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
          <Table className="table-fixed">
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
          <Table className="table-fixed">
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
                    <p className="truncate font-medium">{meeting.title ?? meeting.purpose}</p>
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
        )}
        {data && (
          <div className="p-4">
            <Pagination
              pagination={data.pagination}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}
