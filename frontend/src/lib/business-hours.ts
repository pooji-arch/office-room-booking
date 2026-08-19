export const BUSINESS_HOURS_START = "08:00"
export const BUSINESS_HOURS_END = "18:00"
export const SLOT_DURATION_MINUTES = 60

export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

export function toHHmm(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function generateBusinessHourSlots(): { start: string; end: string }[] {
  const start = toMinutes(BUSINESS_HOURS_START)
  const end = toMinutes(BUSINESS_HOURS_END)
  const slots: { start: string; end: string }[] = []
  for (let t = start; t < end; t += SLOT_DURATION_MINUTES) {
    slots.push({ start: toHHmm(t), end: toHHmm(t + SLOT_DURATION_MINUTES) })
  }
  return slots
}
