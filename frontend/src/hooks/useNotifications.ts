import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { notificationsService } from "@/services/notifications"
import type { ListNotificationsParams } from "@/services/types"

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (params: ListNotificationsParams) => ["notifications", "list", params] as const,
  unreadCount: () => ["notifications", "unreadCount"] as const,
}

export function useNotifications(params: ListNotificationsParams = {}) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationsService.listNotifications(params),
  })
}

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationsService.getUnreadCount(),
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}
