import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { CalendarCheck, Eye } from "lucide-react"
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
import { EmptyState } from "@/components/shared/EmptyState"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { MeetingBucketFilter } from "@/components/shared/MeetingBucketFilter"
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { useMeetings } from "@/hooks/useMeetings"
import { useAuth } from "@/hooks/useAuth"
import { meetingDisplayStatus } from "@/lib/meeting-buckets"
import { formatDateMedium, formatTimeRange, initials } from "@/lib/format"
import type { MeetingBucket } from "@/types"

function typeDeptLabel(type: string, department?: string) {
  const typeLabel = type.charAt(0) + type.slice(1).toLowerCase()
  return department ? `${typeLabel} · ${department}` : typeLabel
}

export function MyMeetingsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [bucket, setBucket] = useState<MeetingBucket>("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { data, isLoading } = useMeetings({
    organizerOrParticipantId: user?.id,
    bucket,
    page,
    pageSize,
  })

  function handlePageSizeChange(size: number) {
    setPageSize(size)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Meetings</h1>
        <MeetingBucketFilter
          value={bucket}
          onChange={(v) => {
            setBucket(v)
            setPage(1)
          }}
        />
      </div>

      <div className="rounded-xl border bg-card">
        {isLoading ? (
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[34%]">Title</TableHead>
                <TableHead className="w-[22%]">Date & Time</TableHead>
                <TableHead className="w-[22%]">Organizer</TableHead>
                <TableHead className="w-[14%]">Status</TableHead>
                <TableHead className="w-[8%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableSkeleton columns={["textStack", "textStack", "avatarText", "badge", "actions"]} />
          </Table>
        ) : data?.data.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No meetings here"
            description="Meetings you organize or are added to will show up in this list."
            action={<Button onClick={() => navigate("/")}>Find a Room</Button>}
          />
        ) : (
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[34%]">Title</TableHead>
                <TableHead className="w-[22%]">Date & Time</TableHead>
                <TableHead className="w-[22%]">Organizer</TableHead>
                <TableHead className="w-[14%]">Status</TableHead>
                <TableHead className="w-[8%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.map((meeting) => (
                <TableRow
                  key={meeting.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/meetings/${meeting.id}`)}
                >
                  <TableCell className="whitespace-normal">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{meeting.title ?? meeting.purpose}</p>
                      {meeting.previousMeetingId && (
                        <StatusBadge status="FOLLOWUP" tone="neutral" label="Follow-up" />
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
                      <span className="truncate">
                        {meeting.bookedBy.id === user?.id ? "You" : meeting.bookedBy.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <StatusBadge status={meetingDisplayStatus(meeting)} />
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => navigate(`/meetings/${meeting.id}`)}
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
            <Pagination pagination={data.pagination} onPageChange={setPage} onPageSizeChange={handlePageSizeChange} />
          </div>
        )}
      </div>
    </div>
  )
}
