import { useState } from "react"
import { toast } from "sonner"
import { CheckSquare, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CardContentSkeleton } from "@/components/shared/PageSkeletons"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ActionItemDialog } from "@/components/shared/ActionItemDialog"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { useActionItems, useDeleteActionItem, useMeeting, useUpdateActionItemStatus } from "@/hooks/useMeetings"
import { formatDateShort, initials, toDateInputValue } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ActionItem, ActionItemStatus } from "@/types"

export function ActionItemsCard({
  meetingId,
  isOrganizerOrAdmin,
  currentUserId,
  previousMeetingId,
}: {
  meetingId: string
  isOrganizerOrAdmin: boolean
  currentUserId: string | undefined
  previousMeetingId?: string
}) {
  const { data: actionItems, isLoading } = useActionItems(meetingId)
  const { data: previousMeeting } = useMeeting(previousMeetingId)
  const { data: previousActionItems } = useActionItems(previousMeetingId)
  const updateStatus = useUpdateActionItemStatus()
  const deleteActionItem = useDeleteActionItem()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<ActionItem | undefined>(undefined)
  const [deletingItem, setDeletingItem] = useState<ActionItem | undefined>(undefined)

  const today = toDateInputValue(new Date())

  async function handleStatusChange(item: ActionItem, status: ActionItemStatus) {
    try {
      await updateStatus.mutateAsync({ meetingId, actionItemId: item.id, status })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status")
    }
  }

  async function handleDelete() {
    if (!deletingItem) return
    try {
      await deleteActionItem.mutateAsync({ meetingId, actionItemId: deletingItem.id })
      toast.success("Action item deleted")
      setDeletingItem(undefined)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete action item")
    }
  }

  return (
    <>
      {!!previousActionItems?.length && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckSquare className="size-4 text-muted-foreground" />
              Before
              <span className="font-normal text-muted-foreground">
                — from &quot;{previousMeeting?.title ?? previousMeeting?.purpose}&quot;
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previousActionItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>{item.ownerName ?? "Unassigned"}</TableCell>
                    <TableCell>{item.dueDate ? formatDateShort(item.dueDate) : "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckSquare className="size-4 text-muted-foreground" />
              Action Items
            </CardTitle>
            {isOrganizerOrAdmin && (
              <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="size-4" />
                Add Action Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className={isLoading || !actionItems || actionItems.length === 0 ? undefined : "p-0"}>
          {isLoading ? (
            <div className="px-6 pb-6">
              <CardContentSkeleton lines={3} />
            </div>
          ) : !actionItems || actionItems.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No action items yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  {isOrganizerOrAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {actionItems.map((item) => {
                  const isOwner = item.ownerId === currentUserId
                  const canChangeStatus = isOrganizerOrAdmin || isOwner
                  const needsSignOff = !isOrganizerOrAdmin && isOwner && item.priority === "HIGH" && item.status !== "DONE"
                  const isOverdue = !!item.dueDate && item.dueDate < today && item.status !== "DONE"

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium">{item.title}</p>
                        {item.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.ownerName ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="size-6 shrink-0">
                              <AvatarFallback className="bg-accent text-[10px] text-accent-foreground">
                                {initials(item.ownerName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{item.ownerName}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className={cn(isOverdue && "font-medium text-destructive")}>
                        {item.dueDate ? formatDateShort(item.dueDate) : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.priority} />
                      </TableCell>
                      <TableCell>
                        {canChangeStatus ? (
                          <>
                            <Select value={item.status} onValueChange={(v) => handleStatusChange(item, v as ActionItemStatus)}>
                              <SelectTrigger size="sm" className="w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="OPEN">Open</SelectItem>
                                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                <SelectItem value="DELAYED">Delayed</SelectItem>
                                <SelectItem value="DONE" disabled={needsSignOff}>
                                  Done
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {needsSignOff && (
                              <p className="mt-1 text-[11px] text-muted-foreground">Needs organizer sign-off</p>
                            )}
                          </>
                        ) : (
                          <StatusBadge status={item.status} />
                        )}
                      </TableCell>
                      {isOrganizerOrAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" onClick={() => setEditingItem(item)}>
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => setDeletingItem(item)}>
                              <Trash2 className="size-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {isOrganizerOrAdmin && (
          <ActionItemDialog meetingId={meetingId} open={showAddDialog} onOpenChange={setShowAddDialog} />
        )}

        {editingItem && (
          <ActionItemDialog
            meetingId={meetingId}
            open={!!editingItem}
            onOpenChange={(open) => !open && setEditingItem(undefined)}
            actionItem={editingItem}
          />
        )}

        <ConfirmDialog
          open={!!deletingItem}
          onOpenChange={(open) => !open && setDeletingItem(undefined)}
          title="Delete this action item?"
          description={`"${deletingItem?.title}" will be permanently removed.`}
          confirmLabel="Delete"
          destructive
          isLoading={deleteActionItem.isPending}
          onConfirm={handleDelete}
        />
      </Card>
    </>
  )
}
