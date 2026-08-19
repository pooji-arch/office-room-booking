import { Calendar, Clock, FileText, Hash, Mail, MapPin, Phone, User as UserIcon, Users } from "lucide-react"
import type { Booking } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateLong, formatTimeRange } from "@/lib/format"

interface DetailRowProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
}

function DetailRow({ icon: Icon, label, value }: DetailRowProps) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}

export function BookingDetailsCard({ booking }: { booking: Booking }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Hash className="size-4 text-muted-foreground" />
          {booking.code}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DetailRow icon={MapPin} label="Room" value={`${booking.roomName} · ${booking.roomLocation}`} />
        <DetailRow icon={Calendar} label="Date" value={formatDateLong(booking.date)} />
        <DetailRow icon={Clock} label="Time" value={formatTimeRange(booking.startTime, booking.endTime)} />
        <DetailRow icon={Users} label="Attendees" value={booking.attendees} />
        <DetailRow icon={UserIcon} label="Booked By" value={booking.bookedBy.name} />
        <DetailRow icon={Mail} label="Email" value={booking.bookedBy.email} />
        {booking.bookedBy.phone && (
          <DetailRow icon={Phone} label="Phone" value={booking.bookedBy.phone} />
        )}
        <DetailRow icon={Calendar} label="Created At" value={new Date(booking.createdAt).toLocaleString()} />
        <div className="sm:col-span-2">
          <DetailRow icon={FileText} label="Purpose" value={booking.purpose} />
        </div>
        {booking.status === "CANCELLED" && booking.cancellationReason && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive sm:col-span-2">
            Cancelled{booking.cancelledAt ? ` on ${new Date(booking.cancelledAt).toLocaleDateString()}` : ""}
            {booking.cancellationReason ? `: ${booking.cancellationReason}` : ""}
          </div>
        )}
        {booking.reassignedAt && (
          <div className="rounded-lg bg-accent p-3 text-sm text-accent-foreground sm:col-span-2">
            Reassigned by {booking.reassignedByName ?? "an admin"} on{" "}
            {new Date(booking.reassignedAt).toLocaleDateString()}
            {booking.reassignmentReason ? ` — ${booking.reassignmentReason}` : ""}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
