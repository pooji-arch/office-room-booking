import { HelpCircle } from "lucide-react"
import { EmptyState } from "@/components/shared/EmptyState"

export function HelpSupportPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Help & Support</h1>
      <EmptyState
        icon={HelpCircle}
        title="Help & Support is coming soon"
        description="FAQs, issue reporting, and support assistance will be available here in a future update."
      />
    </div>
  )
}
