import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AdminMeetingCreatorForm } from "@/components/shared/AdminMeetingCreatorForm"
import { useAdminMeetingCreator } from "@/hooks/useAdminMeetingCreator"

export function MeetingCreatePage() {
  const navigate = useNavigate()
  const creator = useAdminMeetingCreator()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate("/admin/meetings", { replace: true })}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-extrabold tracking-tight">Book a Meeting</h1>
      </div>

      <div className="max-w-xl">
        <AdminMeetingCreatorForm
          creator={creator}
          onCreated={(meetingId) => navigate(`/admin/meetings/${meetingId}`, { replace: true })}
        />
      </div>
    </div>
  )
}
