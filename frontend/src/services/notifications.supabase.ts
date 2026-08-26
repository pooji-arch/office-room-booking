import { supabase } from "./supabaseClient"
import type { Notification } from "@/types"
import type { ListNotificationsParams, NotificationsService } from "./types"

interface NotificationRow {
  id: string
  type: Notification["type"]
  title: string
  message: string
  link: string | null
  meeting_id: string | null
  read: boolean
  created_at: string
}

function mapNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    link: row.link ?? undefined,
    meetingId: row.meeting_id ?? undefined,
    read: row.read,
    createdAt: row.created_at,
  }
}

export const supabaseNotificationsService: NotificationsService = {
  async listNotifications(params: ListNotificationsParams = {}) {
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 20

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) return { data: [], pagination: { page, pageSize, total: 0, totalPages: 1 } }

    // Explicitly scoped to the signed-in user, even though RLS also allows
    // admins to read any row — this page is always "my notifications," not
    // a global admin feed of everyone else's.
    let query = supabase.from("notifications").select("*", { count: "exact" }).eq("recipient_id", userId)
    if (params.unreadOnly) query = query.eq("read", false)
    query = query.order("created_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query
    if (error) throw error

    const total = count ?? 0
    return {
      data: (data as NotificationRow[] | null ?? []).map(mapNotification),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    }
  },

  async markRead(id) {
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return mapNotification(data as NotificationRow)
  },

  async markAllRead() {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) return
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("recipient_id", userId)
      .eq("read", false)
    if (error) throw error
  },

  async getUnreadCount() {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) return 0
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .eq("read", false)
    if (error) throw error
    return count ?? 0
  },
}
