import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/services/supabaseClient"
import { bookingKeys } from "./useBookings"
import { roomKeys } from "./useRooms"

export function useBookingsRealtime() {
  const qc = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel("bookings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        qc.invalidateQueries({ queryKey: bookingKeys.all })
        qc.invalidateQueries({ queryKey: roomKeys.all })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [qc])
}
