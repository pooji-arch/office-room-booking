import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/services/supabaseClient"
import { meetingKeys } from "./useMeetings"
import { roomKeys } from "./useRooms"

export function useMeetingsRealtime() {
  const qc = useQueryClient()

  useEffect(() => {
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: meetingKeys.all })
      qc.invalidateQueries({ queryKey: roomKeys.all })
    }

    const channel = supabase
      .channel("meetings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "meeting_participants" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "agenda_items" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "minutes" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "minutes_items" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "minutes_revisions" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "action_items" }, invalidate)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [qc])
}
