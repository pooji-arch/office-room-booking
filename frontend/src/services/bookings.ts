import { supabaseBookingsService } from "./bookings.supabase"
import type { BookingsService } from "./types"

export const bookingsService: BookingsService = supabaseBookingsService
