import { useMemo } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Building2, ChevronDown, X } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { DateTimePicker } from "@/components/shared/DateTimePicker"
import { SearchInput } from "@/components/shared/SearchInput"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Pagination } from "@/components/shared/Pagination"
import { EmptyState } from "@/components/shared/EmptyState"
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { useMeetings } from "@/hooks/useMeetings"
import { departmentTone, MEETING_TYPE_OPTIONS, meetingDisplayStatus, meetingTypeLabel } from "@/lib/meeting-buckets"
import { formatDateMedium, formatTime12h, initials } from "@/lib/format"
import type { Meeting, MeetingType, PaginationMeta } from "@/types"

const UNSPECIFIED = "Unspecified"

export function DepartmentsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get("search") ?? ""
  const dateFrom = searchParams.get("dateFrom") ?? ""
  const dateTo = searchParams.get("dateTo") ?? ""
  const timeFrom = searchParams.get("timeFrom") ?? ""
  const timeTo = searchParams.get("timeTo") ?? ""
  const typeFilter = (searchParams.get("type") as MeetingType | null) ?? "all"
  const departmentsParam = searchParams.get("department")
  // null = no filter (every department included) — the default, and also
  // what checking every box collapses back to. "none" is a distinct
  // sentinel from "no param at all": without it, unchecking the last
  // department would produce an empty string, which updateParams treats as
  // "delete this param," silently snapping back to "all" instead of
  // actually showing zero departments (same fix already used for the Home
  // page's Categories filter).
  const selectedDepartments = useMemo(
    () => (departmentsParam === "none" ? [] : departmentsParam ? departmentsParam.split(",") : null),
    [departmentsParam]
  )
  const page = Number(searchParams.get("page") ?? "1")
  const pageSize = Number(searchParams.get("pageSize") ?? "10")
  const debouncedSearch = useDebouncedValue(search)

  function updateParams(updates: Record<string, string>) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(updates)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        return next
      },
      { replace: true }
    )
  }

  const { data, isLoading } = useMeetings({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    timeFrom: timeFrom || undefined,
    timeTo: timeTo || undefined,
    pageSize: 500,
  })

  // Department is free text typed at booking time, so "Development" and
  // "development" (or "Operation" vs "Operations") need a canonical label
  // resolved once here — every meeting in a given case-insensitive bucket
  // then displays and filters under that same label, everywhere on this
  // page, rather than whatever exact string it happened to be booked with.
  const { canonicalLabelByRawDept, allDepartmentLabels } = useMemo(() => {
    const labelCounts = new Map<string, Map<string, number>>()
    for (const m of data?.data ?? []) {
      const raw = m.department?.trim() || UNSPECIFIED
      const key = raw.toLowerCase()
      const byLabel = labelCounts.get(key) ?? new Map<string, number>()
      byLabel.set(raw, (byLabel.get(raw) ?? 0) + 1)
      labelCounts.set(key, byLabel)
    }
    const canonicalByKey = new Map<string, string>()
    for (const [key, byLabel] of labelCounts) {
      canonicalByKey.set(key, [...byLabel.entries()].sort((a, b) => b[1] - a[1])[0][0])
    }
    const canonicalLabelByRawDept = (raw: string | undefined) =>
      canonicalByKey.get((raw?.trim() || UNSPECIFIED).toLowerCase()) ?? UNSPECIFIED
    const allDepartmentLabels = [...canonicalByKey.values()].sort((a, b) =>
      a === UNSPECIFIED ? 1 : b === UNSPECIFIED ? -1 : a.localeCompare(b)
    )
    return { canonicalLabelByRawDept, allDepartmentLabels }
  }, [data])

  const meetingsWithCanonicalDept = useMemo(
    () => (data?.data ?? []).map((m) => ({ meeting: m, department: canonicalLabelByRawDept(m.department) })),
    [data, canonicalLabelByRawDept]
  )

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return meetingsWithCanonicalDept
      .filter(({ department }) => selectedDepartments === null || selectedDepartments.includes(department))
      .filter(({ meeting }) => typeFilter === "all" || meeting.type === typeFilter)
      .filter(
        ({ meeting }) =>
          !q ||
          (meeting.title ?? meeting.purpose).toLowerCase().includes(q) ||
          meeting.bookedBy.name.toLowerCase().includes(q)
      )
      .sort((a, b) =>
        a.meeting.date === b.meeting.date
          ? b.meeting.startTime.localeCompare(a.meeting.startTime)
          : b.meeting.date.localeCompare(a.meeting.date)
      )
  }, [meetingsWithCanonicalDept, selectedDepartments, typeFilter, debouncedSearch])

  function toggleDepartment(dept: string) {
    const current = selectedDepartments ?? allDepartmentLabels
    const next = current.includes(dept) ? current.filter((d) => d !== dept) : [...current, dept]
    updateParams({
      department: next.length === allDepartmentLabels.length ? "" : next.length === 0 ? "none" : next.join(","),
      page: "1",
    })
  }

  const departmentsLabel =
    selectedDepartments === null
      ? "All Departments"
      : selectedDepartments.length === 0
        ? "No Departments"
        : selectedDepartments.length === 1
          ? selectedDepartments[0]
          : `${selectedDepartments.length} selected`

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const clampedPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((clampedPage - 1) * pageSize, clampedPage * pageSize)
  const pagination: PaginationMeta = {
    page: clampedPage,
    pageSize,
    total: filtered.length,
    totalPages,
  }

  const hasActiveFilters =
    search !== "" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    timeFrom !== "" ||
    timeTo !== "" ||
    typeFilter !== "all" ||
    departmentsParam !== null

  function clearFilters() {
    setSearchParams({}, { replace: true })
  }

  const activeLabel =
    selectedDepartments === null
      ? "All Department"
      : selectedDepartments.length === 1
        ? selectedDepartments[0]
        : `${selectedDepartments.length} Department${selectedDepartments.length === 1 ? "" : "s"}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Departments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading
            ? "Loading…"
            : `${allDepartmentLabels.length} department${allDepartmentLabels.length === 1 ? "" : "s"} · ${meetingsWithCanonicalDept.length} meeting${meetingsWithCanonicalDept.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Department</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full max-w-xs justify-between font-normal">
              {departmentsLabel}
              <ChevronDown className="size-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]" align="start">
            {allDepartmentLabels.map((dept) => (
              <DropdownMenuCheckboxItem
                key={dept}
                checked={selectedDepartments === null || selectedDepartments.includes(dept)}
                onCheckedChange={() => toggleDepartment(dept)}
                onSelect={(e) => e.preventDefault()}
              >
                {dept}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold tracking-tight">{activeLabel} Meetings</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={(v) => updateParams({ search: v, page: "1" })}
            placeholder="Search meetings..."
            className="w-full max-w-xs"
          />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DateTimePicker
              date={dateFrom}
              time={timeFrom}
              onDateChange={(v) => updateParams({ dateFrom: v, page: "1" })}
              onTimeChange={(v) => updateParams({ timeFrom: v, page: "1" })}
              placeholder="From"
              className="w-[170px]"
            />
            <span>to</span>
            <DateTimePicker
              date={dateTo}
              time={timeTo}
              onDateChange={(v) => updateParams({ dateTo: v, page: "1" })}
              onTimeChange={(v) => updateParams({ timeTo: v, page: "1" })}
              placeholder="To"
              className="w-[170px]"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => updateParams({ type: v === "all" ? "" : v, page: "1" })}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {MEETING_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              <X className="size-4" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        {isLoading ? (
          <Table className="hidden table-fixed md:table">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[16%]">Date &amp; Time</TableHead>
                <TableHead className="w-[14%]">Department</TableHead>
                <TableHead className="w-[27%]">Meeting Title</TableHead>
                <TableHead className="w-[14%]">Type</TableHead>
                <TableHead className="w-[19%]">Organized By</TableHead>
                <TableHead className="w-[10%]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableSkeleton
              columns={["textStack", "badge", "textStack", "badge", "avatarText", "badge"]}
            />
          </Table>
        ) : pageItems.length === 0 ? (
          <EmptyState icon={Building2} title="No meetings found" description="Try adjusting your filters." />
        ) : (
          <>
            <Table className="hidden table-fixed md:table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[16%]">Date &amp; Time</TableHead>
                  <TableHead className="w-[14%]">Department</TableHead>
                  <TableHead className="w-[27%]">Meeting Title</TableHead>
                  <TableHead className="w-[14%]">Type</TableHead>
                  <TableHead className="w-[19%]">Organized By</TableHead>
                  <TableHead className="w-[10%]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map(({ meeting, department }: { meeting: Meeting; department: string }) => (
                  <TableRow
                    key={meeting.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/meetings/${meeting.id}`)}
                  >
                    <TableCell className="whitespace-normal">
                      <p className="font-semibold break-words text-foreground">{formatDateMedium(meeting.date)}</p>
                      <p className="text-xs break-words text-muted-foreground">
                        {formatTime12h(meeting.startTime)} – {formatTime12h(meeting.endTime)}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-0 overflow-hidden whitespace-normal">
                      <StatusBadge
                        status={department}
                        tone={departmentTone(allDepartmentLabels, department)}
                        label={department}
                        className="max-w-full truncate"
                      />
                    </TableCell>
                    <TableCell className="max-w-0 truncate font-medium">{meeting.title ?? meeting.purpose}</TableCell>
                    <TableCell className="max-w-0 overflow-hidden whitespace-normal">
                      <StatusBadge
                        status={meeting.type}
                        tone="purple"
                        label={meetingTypeLabel(meeting.type)}
                        className="max-w-full truncate"
                      />
                    </TableCell>
                    <TableCell className="max-w-0 whitespace-normal">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar className="size-7 shrink-0">
                          <AvatarFallback className="bg-accent text-xs text-accent-foreground">
                            {initials(meeting.bookedBy.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{meeting.bookedBy.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-0 overflow-hidden whitespace-normal">
                      <StatusBadge
                        status={meetingDisplayStatus(meeting)}
                        className="max-w-full truncate"
                        showDot={false}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="divide-y md:hidden">
              {pageItems.map(({ meeting, department }: { meeting: Meeting; department: string }) => (
                <button
                  key={meeting.id}
                  type="button"
                  onClick={() => navigate(`/admin/meetings/${meeting.id}`)}
                  className="flex w-full flex-col gap-2 p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{formatDateMedium(meeting.date)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime12h(meeting.startTime)} – {formatTime12h(meeting.endTime)}
                      </p>
                    </div>
                    <StatusBadge
                      status={meetingDisplayStatus(meeting)}
                      className="shrink-0"
                      showDot={false}
                    />
                  </div>
                  <p className="truncate font-medium">{meeting.title ?? meeting.purpose}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge
                      status={department}
                      tone={departmentTone(allDepartmentLabels, department)}
                      label={department}
                      className="max-w-[55%] truncate"
                    />
                    <StatusBadge
                      status={meeting.type}
                      tone="purple"
                      label={meetingTypeLabel(meeting.type)}
                      className="max-w-[40%] truncate"
                    />
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar className="size-6 shrink-0">
                      <AvatarFallback className="bg-accent text-[10px] text-accent-foreground">
                        {initials(meeting.bookedBy.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm text-muted-foreground">{meeting.bookedBy.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
        {!isLoading && filtered.length > 0 && (
          <div className="p-4">
            <Pagination
              pagination={pagination}
              onPageChange={(p) => updateParams({ page: String(p) })}
              onPageSizeChange={(size) => updateParams({ pageSize: String(size), page: "1" })}
            />
          </div>
        )}
      </div>
    </div>
  )
}
