import { supabaseMeetingsService } from "./meetings.supabase"
import type { MeetingsService } from "./types"

export const meetingsService: MeetingsService = supabaseMeetingsService
