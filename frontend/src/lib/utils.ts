import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Free-text fields (department, room location) accumulate case variants of
// what's really the same value over time ("Development" vs "development") —
// this collapses them to one entry per case-insensitive value, keeping
// whichever exact casing appears most often as the canonical display form,
// so a picker/filter built from real data doesn't show duplicate options.
export function dedupeCaseInsensitive(values: string[]): string[] {
  const counts = new Map<string, Map<string, number>>()
  for (const v of values) {
    const key = v.toLowerCase()
    const byLabel = counts.get(key) ?? new Map<string, number>()
    byLabel.set(v, (byLabel.get(v) ?? 0) + 1)
    counts.set(key, byLabel)
  }
  return [...counts.values()]
    .map((byLabel) => [...byLabel.entries()].sort((a, b) => b[1] - a[1])[0][0])
    .sort((a, b) => a.localeCompare(b))
}

// A dropdown built from real data (e.g. departments in use) needs to still
// show a record's own current value even if it's a stale variant that
// doesn't case-insensitively match anything in that list (typed before a
// dropdown existed, or before an earlier duplicate got merged away) —
// otherwise editing that record renders the select as blank.
export function ensureIncluded(options: string[], value: string | null | undefined): string[] {
  if (!value || options.some((o) => o.toLowerCase() === value.toLowerCase())) return options
  return [...options, value].sort((a, b) => a.localeCompare(b))
}
