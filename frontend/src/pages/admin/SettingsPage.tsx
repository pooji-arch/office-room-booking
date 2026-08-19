import { Settings } from "lucide-react"
import { EmptyState } from "@/components/shared/EmptyState"

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <EmptyState
        icon={Settings}
        title="Settings are coming soon"
        description="Business hours, slot duration, and other system settings will be configurable here in a future update."
      />
    </div>
  )
}
