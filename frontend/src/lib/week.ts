import { toDateInputValue } from "./format"

export function getWeekDays(date: Date): string[] {
  const day = date.getDay() // 0=Sun
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + mondayOffset)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return toDateInputValue(d)
  })
}
