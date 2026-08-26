import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { MeetingBucket } from "@/types"

const OPTIONS: { value: MeetingBucket; label: string }[] = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "followup", label: "Follow-up" },
]

export function MeetingBucketFilter({
  value,
  onChange,
}: {
  value: MeetingBucket
  onChange: (value: MeetingBucket) => void
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as MeetingBucket)}>
      <SelectTrigger className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
