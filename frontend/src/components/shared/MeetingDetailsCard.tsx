import { Hash } from "lucide-react"
import type { Meeting } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { formatDateLong, formatTimeRange } from "@/lib/format"
import { typeDeptLabel } from "@/lib/meeting-buckets"
import { useMeeting } from "@/hooks/useMeetings"

interface FieldProps {
  label: string
  value: React.ReactNode
  span?: boolean
}

function Field({ label, value, span }: FieldProps) {
  return (
    <div className={span ? "sm:col-span-2" : undefined}>
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

export function MeetingDetailsCard({ meeting }: { meeting: Meeting }) {
  const { data: previousMeeting } = useMeeting(meeting.previousMeetingId)

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Hash className="size-3.5" />
          {meeting.code}
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Purpose" value={meeting.purpose} span />
          <Field label="Type / Department" value={typeDeptLabel(meeting.type, meeting.department)} />
          <Field label="Date & Time" value={`${formatDateLong(meeting.date)} · ${formatTimeRange(meeting.startTime, meeting.endTime)}`} />
          <Field label="Room" value={`${meeting.roomName} · ${meeting.roomLocation}`} />
          {meeting.reviewDate && <Field label="Review Date" value={formatDateLong(meeting.reviewDate)} />}
          {previousMeeting && <Field label="Follow-up to" value={previousMeeting.code} />}
          <Field label="Organizer" value={meeting.bookedBy.name} />
          <Field label="Email" value={meeting.bookedBy.email} />
          {meeting.bookedBy.phone && <Field label="Phone" value={meeting.bookedBy.phone} />}
        </div>
      </CardContent>
    </Card>
  )
}
