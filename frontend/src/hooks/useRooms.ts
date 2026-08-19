import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { roomsService } from "@/services/rooms"
import type { ListRoomsParams, RoomInput } from "@/services/types"

export const roomKeys = {
  all: ["rooms"] as const,
  list: (params: ListRoomsParams) => ["rooms", "list", params] as const,
  detail: (id: string) => ["rooms", "detail", id] as const,
  locations: ["rooms", "locations"] as const,
  availability: (id: string, date: string) =>
    ["rooms", "availability", id, date] as const,
}

export function useRooms(params: ListRoomsParams = {}) {
  return useQuery({
    queryKey: roomKeys.list(params),
    queryFn: () => roomsService.listRooms(params),
  })
}

export function useRoom(id: string | undefined) {
  return useQuery({
    queryKey: roomKeys.detail(id ?? ""),
    queryFn: () => roomsService.getRoom(id!),
    enabled: !!id,
  })
}

export function useRoomLocations() {
  return useQuery({
    queryKey: roomKeys.locations,
    queryFn: () => roomsService.listRoomLocations(),
  })
}

export function useRoomAvailability(id: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: roomKeys.availability(id ?? "", date ?? ""),
    queryFn: () => roomsService.getRoomAvailability(id!, date!),
    enabled: !!id && !!date,
  })
}

export function useCreateRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RoomInput) => roomsService.createRoom(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: roomKeys.all }),
  })
}

export function useUpdateRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<RoomInput> }) =>
      roomsService.updateRoom(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: roomKeys.all }),
  })
}

export function useDeleteRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => roomsService.deleteRoom(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: roomKeys.all }),
  })
}
