import { supabaseNotificationsService } from "./notifications.supabase"
import type { NotificationsService } from "./types"

export const notificationsService: NotificationsService = supabaseNotificationsService
