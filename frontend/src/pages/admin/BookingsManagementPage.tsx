import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { CalendarRange, Eye, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { BookingStatusTabs } from "@/components/shared/BookingStatusTabs"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { useBookings, useCancelBooking } from "@/hooks/useBookings"
import { useRooms } from "@/hooks/useRooms"
import { bookingDisplayStatus } from "@/lib/booking-buckets"
import { formatDateShort, formatTimeRange } from "@/lib/format"
import { toast } from "sonner"
import type { Booking, BookingBucket } from "@/types"

const TABS: { value: BookingBucket; label: string }[] = [
  { value: "all", label: "All Bookings" },
  { value: "upcoming", label: "Upcoming" },
  { value: "today", label: "Today" },
  { value: "past", label: "Past" },
  { value: "cancelled", label: "Cancelled" },
]

export function BookingsManagementPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [roomId, setRoomId] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [bucket, setBucket] = useState<BookingBucket>("all")
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search)

  const { data: rooms } = useRooms({ pageSize: 100 })
  const { data, isLoading } = useBookings({
    search: debouncedSearch,
    roomId: roomId === "all" ? undefined : roomId,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    bucket,
    page,
  })
  const cancelBooking = useCancelBooking()
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null)

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

  async function confirmCancel() {
    if (!bookingToCancel) return
    try {
      await cancelBooking.mutateAsync({ id: bookingToCancel.id, reason: "Cancelled by admin" })
      toast.success(`Booking ${bookingToCancel.code} cancelled`)
      setBookingToCancel(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel booking")
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Search bookings..."
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
        {hasActiveFilters && (
          <Button type="button" variant="ghost" onClick={clearFilters}>
            <X className="size-4" />
            Clear Filters
          </Button>
        )}
      </div>

      <BookingStatusTabs
        value={bucket}
        onChange={(v) => {
          setBucket(v)
          setPage(1)
        }}
        tabs={TABS}
      />

      <div className="rounded-xl border bg-card">
        {!isLoading && data?.data.length === 0 ? (
          <EmptyState icon={CalendarRange} title="No bookings found" description="Try adjusting your filters." />
        ) : (
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Booked By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.map((booking) => (
                <TableRow
                  key={booking.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                >
                  <TableCell>
                    <p className="font-medium">{formatDateShort(booking.date)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimeRange(booking.startTime, booking.endTime)}
                    </p>
                  </TableCell>
                  <TableCell>{booking.roomName}</TableCell>
                  <TableCell>{booking.bookedBy.name}</TableCell>
                  <TableCell>
                    <StatusBadge status={bookingDisplayStatus(booking)} />
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={booking.status === "CANCELLED"}
                        onClick={() => setBookingToCancel(booking)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {data && (
          <div className="p-4">
            <Pagination pagination={data.pagination} onPageChange={setPage} />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!bookingToCancel}
        onOpenChange={(open) => !open && setBookingToCancel(null)}
        title="Cancel this booking?"
        description={`Booking ${bookingToCancel?.code} for ${bookingToCancel?.roomName} will be cancelled and the slot freed up.`}
        confirmLabel="Cancel Booking"
        destructive
        isLoading={cancelBooking.isPending}
        onConfirm={confirmCancel}
      />
    </div>
  )
}
