import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { bookingsService } from "@/services/bookings"
import type {
  CreateBookingInput,
  ListBookingsParams,
  ReassignBookingInput,
  RescheduleBookingInput,
} from "@/services/types"
import { roomKeys } from "./useRooms"

export const bookingKeys = {
  all: ["bookings"] as const,
  list: (params: ListBookingsParams) => ["bookings", "list", params] as const,
  detail: (id: string) => ["bookings", "detail", id] as const,
}

function invalidateBookingRelated(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: bookingKeys.all })
  qc.invalidateQueries({ queryKey: roomKeys.all })
}

export function useBookings(params: ListBookingsParams = {}) {
  return useQuery({
    queryKey: bookingKeys.list(params),
    queryFn: () => bookingsService.listBookings(params),
  })
}

export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: bookingKeys.detail(id ?? ""),
    queryFn: () => bookingsService.getBooking(id!),
    enabled: !!id,
  })
}

export function useCreateBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBookingInput) => bookingsService.createBooking(input),
    onSuccess: () => invalidateBookingRelated(qc),
  })
}

export function useUpdateBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: { purpose?: string; attendees?: number }
    }) => bookingsService.updateBooking(id, input),
    onSuccess: () => invalidateBookingRelated(qc),
  })
}

export function useReassignBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReassignBookingInput }) =>
      bookingsService.reassignBooking(id, input),
    onSuccess: () => invalidateBookingRelated(qc),
  })
}

export function useRescheduleBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RescheduleBookingInput }) =>
      bookingsService.rescheduleBooking(id, input),
    onSuccess: () => invalidateBookingRelated(qc),
  })
}

export function useCancelBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      bookingsService.cancelBooking(id, reason),
    onSuccess: () => invalidateBookingRelated(qc),
  })
}
