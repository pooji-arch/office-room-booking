import { supabaseRoomsService } from "./rooms.supabase"
import type { RoomsService } from "./types"

export const roomsService: RoomsService = supabaseRoomsService
