import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/EmptyState"
import { AdminMeetingEditorForm } from "@/components/shared/AdminMeetingEditorForm"
import { FormPageSkeleton } from "@/components/shared/PageSkeletons"
import { useAdminMeetingEditor } from "@/hooks/useAdminMeetingEditor"

export function MeetingEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editor = useAdminMeetingEditor(id)
  const { meeting, isLoading, isReadOnly } = editor

  if (isLoading || !meeting) {
    return <FormPageSkeleton fields={4} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {/* replace, not a plain push — see the user-side Reschedule fix for
            why (same fix, same underlying bug: entering via replace too,
            in MeetingDetailsPage, keeps this meeting's history footprint
            to exactly one entry). */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate(`/admin/meetings/${meeting.id}`, { replace: true })}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Edit & Reassign Meeting</h1>
      </div>

      {isReadOnly ? (
        <EmptyState
          icon={Lock}
          title="This meeting is completed"
          description="Completed meetings can no longer be edited."
          action={
            <Button variant="outline" onClick={() => navigate(`/admin/meetings/${meeting.id}`, { replace: true })}>
              Back to Meeting
            </Button>
          }
        />
      ) : (
        <div className="max-w-xl">
          <AdminMeetingEditorForm editor={editor} onSaved={() => navigate(`/admin/meetings/${meeting.id}`, { replace: true })} />
        </div>
      )}
    </div>
  )
}
