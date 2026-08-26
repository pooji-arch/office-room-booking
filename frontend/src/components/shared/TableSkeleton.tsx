import { Skeleton } from "@/components/ui/skeleton"
import { TableBody, TableCell, TableRow } from "@/components/ui/table"

export type SkeletonColumnKind = "avatarText" | "textStack" | "text" | "badge" | "actions"

interface TableSkeletonProps {
  rows?: number
  columns: SkeletonColumnKind[]
}

export function TableSkeleton({ rows = 6, columns }: TableSkeletonProps) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          {columns.map((kind, j) => (
            <TableCell key={j}>
              {kind === "avatarText" && (
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              )}
              {kind === "textStack" && (
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              )}
              {kind === "text" && <Skeleton className="h-3.5 w-24" />}
              {kind === "badge" && <Skeleton className="h-5 w-16 rounded-full" />}
              {kind === "actions" && (
                <div className="flex justify-end gap-1">
                  <Skeleton className="size-7 rounded-md" />
                  <Skeleton className="size-7 rounded-md" />
                </div>
              )}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  )
}
