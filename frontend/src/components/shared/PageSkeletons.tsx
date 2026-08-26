import { Skeleton } from "@/components/ui/skeleton"

export function CardContentSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={i === lines - 1 ? "h-4 w-2/3" : "h-4 w-full"} />
      ))}
    </div>
  )
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-7 w-40" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="max-w-2xl space-y-4">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-32 rounded-md" />
            ))}
          </div>
          <div className="space-y-3 rounded-xl border bg-card p-5">
            <CardContentSkeleton lines={4} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function FormPageSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="h-7 w-48" />
      </div>
      <div className="space-y-5 rounded-xl border bg-card p-6">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </div>
  )
}

export function RoomDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-72 w-full rounded-xl" />
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function CalendarPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="h-7 w-56" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
          <Skeleton className="h-[560px] w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function DialogBodySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-2/3" />
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProfilePageSkeleton() {
  return (
    <div className="max-w-xl space-y-6">
      <Skeleton className="h-7 w-28" />
      <div className="flex items-center gap-4 rounded-xl border bg-card p-6">
        <Skeleton className="size-16 shrink-0 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
      <div className="space-y-4 rounded-xl border bg-card p-6">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
