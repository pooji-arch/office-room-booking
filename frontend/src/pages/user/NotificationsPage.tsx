import { Bell } from "lucide-react"
import { EmptyState } from "@/components/shared/EmptyState"

export function NotificationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
      <EmptyState
        icon={Bell}
        title="No notifications yet"
        description="Booking confirmations, cancellations, and reminders will show up here in a future update."
      />
    </div>
  )
}
