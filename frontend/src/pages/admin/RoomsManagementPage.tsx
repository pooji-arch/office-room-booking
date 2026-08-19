import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { DoorOpen, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SearchInput } from "@/components/shared/SearchInput"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Pagination } from "@/components/shared/Pagination"
import { EmptyState } from "@/components/shared/EmptyState"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { RoomImagePlaceholder } from "@/components/shared/RoomImagePlaceholder"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { useDeleteRoom, useRooms } from "@/hooks/useRooms"
import { toast } from "sonner"
import type { Room } from "@/types"

export function RoomsManagementPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search)
  const { data, isLoading } = useRooms({ search: debouncedSearch, page })
  const deleteRoom = useDeleteRoom()
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null)

  async function confirmDelete() {
    if (!roomToDelete) return
    try {
      await deleteRoom.mutateAsync(roomToDelete.id)
      toast.success(`${roomToDelete.name} removed from bookable rooms`)
      setRoomToDelete(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete room")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Rooms Management</h1>
        <Button onClick={() => navigate("/admin/rooms/new")}>
          <Plus className="size-4" />
          Add Room
        </Button>
      </div>

      <SearchInput
        value={search}
        onChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        placeholder="Search rooms by name or location..."
        className="max-w-sm"
      />

      <div className="rounded-xl border bg-card">
        {!isLoading && data?.data.length === 0 ? (
          <EmptyState
            icon={DoorOpen}
            title="No rooms found"
            description="Try a different search, or add a new room to get started."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room Name</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.map((room) => (
                <TableRow key={room.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {room.imageUrl ? (
                        <img
                          src={room.imageUrl}
                          alt={room.name}
                          className="size-9 rounded-md object-cover"
                        />
                      ) : (
                        <RoomImagePlaceholder seed={room.id} className="size-9 rounded-md" />
                      )}
                      <span className="font-medium">{room.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{room.capacity} people</TableCell>
                  <TableCell>{room.location}</TableCell>
                  <TableCell>
                    <StatusBadge status={room.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => navigate(`/admin/rooms/${room.id}/edit`)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setRoomToDelete(room)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {data && (
          <div className="p-4">
            <Pagination pagination={data.pagination} onPageChange={setPage} />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!roomToDelete}
        onOpenChange={(open) => !open && setRoomToDelete(null)}
        title="Delete this room?"
        description={`"${roomToDelete?.name}" will be removed from the bookable room list. Existing bookings for this room keep their historical details.`}
        confirmLabel="Delete Room"
        destructive
        isLoading={deleteRoom.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
