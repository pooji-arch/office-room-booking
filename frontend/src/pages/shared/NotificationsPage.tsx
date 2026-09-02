import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  AlarmClock,
  AlertTriangle,
  ArrowLeftRight,
  Bell,
  CalendarClock,
  CheckSquare,
  ClipboardCheck,
  Clock,
  FileClock,
  UserPlus,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { Pagination } from "@/components/shared/Pagination"
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationsCount,
} from "@/hooks/useNotifications"
import { formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Notification, NotificationType } from "@/types"

const PAGE_SIZE = 10

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  PARTICIPANT_ADDED: UserPlus,
  ACTION_ITEM_ASSIGNED: CheckSquare,
  MEETING_CANCELLED: XCircle,
  MEETING_RESCHEDULED: CalendarClock,
  MINUTES_FINALIZED: ClipboardCheck,
  MEETING_REMINDER_24H: CalendarClock,
  MEETING_REMINDER_1H: AlarmClock,
  ACTION_ITEM_DUE_SOON: Clock,
  ACTION_ITEM_OVERDUE_DIGEST: AlertTriangle,
  MOM_PENDING_NUDGE: FileClock,
  MEETING_ORGANIZER_CHANGED: ArrowLeftRight,
}

function NotificationCard({
  notification,
  onOpen,
}: {
  notification: Notification
  onOpen: (notification: Notification) => void
}) {
  const Icon = TYPE_ICON[notification.type]
  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      className={cn(
        "relative flex w-full items-start gap-3 rounded-xl border bg-card px-4 py-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        !notification.read &&
          "bg-primary/5 before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-primary"
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
        <Icon className="size-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", !notification.read ? "font-semibold" : "font-medium")}>
          {notification.title}
        </p>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{notification.message}</p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">
        {formatRelativeTime(notification.createdAt)}
      </span>
    </button>
  )
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading } = useNotifications({ page, pageSize: PAGE_SIZE })
  const { data: unreadCount } = useUnreadNotificationsCount()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  function openNotification(notification: Notification) {
    if (!notification.read) markRead.mutate(notification.id)
    if (notification.link) navigate(notification.link)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Notifications</h1>
        <Button
          variant="outline"
          size="sm"
          disabled={!unreadCount || markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
        >
          Mark all as read
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3.5">
              <Skeleton className="size-9 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3.5 w-64" />
              </div>
              <Skeleton className="h-3.5 w-12 shrink-0" />
            </div>
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            description="Updates about your meetings — participants added, action items assigned, cancellations, and finalized minutes — will show up here."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {data?.data.map((notification) => (
            <NotificationCard key={notification.id} notification={notification} onOpen={openNotification} />
          ))}
        </div>
      )}

      {data && data.data.length > 0 && (
        <Pagination pagination={data.pagination} onPageChange={setPage} />
      )}
    </div>
  )
}
