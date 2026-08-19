import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { CalendarCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/EmptyState"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { BookingStatusTabs } from "@/components/shared/BookingStatusTabs"
import { useBookings } from "@/hooks/useBookings"
import { useAuth } from "@/hooks/useAuth"
import { bookingDisplayStatus } from "@/lib/booking-buckets"
import { formatDateShort, formatTimeRange } from "@/lib/format"
import type { BookingBucket } from "@/types"

const TABS: { value: BookingBucket; label: string }[] = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

export function MyBookingsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [bucket, setBucket] = useState<BookingBucket>("all")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useBookings({
    bookedById: user?.id,
    bucket,
    page,
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">My Bookings</h1>

      <BookingStatusTabs
        value={bucket}
        onChange={(v) => {
          setBucket(v)
          setPage(1)
        }}
        tabs={TABS}
      />

      {!isLoading && data?.data.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No bookings here"
          description="Bookings you make will show up in this list."
          action={<Button onClick={() => navigate("/")}>Find a Room</Button>}
        />
      ) : (
        <div className="space-y-3">
          {data?.data.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
                <div>
                  <p className="font-medium">{booking.roomName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateShort(booking.date)} · {formatTimeRange(booking.startTime, booking.endTime)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={bookingDisplayStatus(booking)} />
                  <Button variant="outline" size="sm" onClick={() => navigate(`/my-bookings/${booking.id}`)}>
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data && data.data.length > 0 && (
        <Pagination pagination={data.pagination} onPageChange={setPage} />
      )}
    </div>
  )
}
