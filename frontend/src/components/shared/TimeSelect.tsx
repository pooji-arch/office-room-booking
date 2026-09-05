import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)

function parse24h(value: string) {
  const [h, m] = value.split(":").map(Number)
  const meridiem: "AM" | "PM" = h >= 12 ? "PM" : "AM"
  let hour12 = h % 12
  if (hour12 === 0) hour12 = 12
  return { hour12, minute: m, meridiem }
}

function to24h(hour12: number, minute: number, meridiem: "AM" | "PM") {
  let h = hour12 % 12
  if (meridiem === "PM") h += 12
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

// Native <input type="time"> can't be restyled — its dropdown/spinner is
// rendered by the OS/browser itself, completely outside CSS's reach (this
// was the actual native picker showing up in the middle of an otherwise
// themed form). This is a fully custom replacement built from the app's own
// themed Select, so the whole picking experience matches everywhere.
export function TimeSelect({
  value,
  onChange,
  id,
}: {
  value: string
  onChange: (value: string) => void
  id?: string
}) {
  const { hour12, minute, meridiem } = parse24h(value)

  function update(next: Partial<{ hour12: number; minute: number; meridiem: "AM" | "PM" }>) {
    onChange(
      to24h(next.hour12 ?? hour12, next.minute ?? minute, next.meridiem ?? meridiem)
    )
  }

  return (
    <div id={id} className="flex gap-1.5">
      <Select value={String(hour12)} onValueChange={(v) => update({ hour12: Number(v) })}>
        <SelectTrigger size="sm" className="w-[62px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => (
            <SelectItem key={h} value={String(h)}>
              {String(h).padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(minute)} onValueChange={(v) => update({ minute: Number(v) })}>
        <SelectTrigger size="sm" className="w-[62px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => (
            <SelectItem key={m} value={String(m)}>
              {String(m).padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={meridiem} onValueChange={(v) => update({ meridiem: v as "AM" | "PM" })}>
        <SelectTrigger size="sm" className="w-[68px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
