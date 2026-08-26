import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/services/supabaseClient"
import { notificationKeys } from "./useNotifications"

export function useNotificationsRealtime() {
  const qc = useQueryClient()

  useEffect(() => {
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all })
    }

    const channel = supabase
      .channel("notifications-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, invalidate)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [qc])
}
