-- 0024_remove_business_hours_restriction.sql
--
-- Requested directly: remove the "bookings must end by 6pm" (09:00-18:00
-- business-hours) restriction entirely -- a meeting can now be booked at
-- any time of day. This is the database-side half of a change already
-- applied to the frontend (TimeRangeInput and the room-search time filter
-- no longer clamp to 09:00-18:00 or show a business-hours error) --
-- without this migration, the frontend would let someone try to book
-- outside 09:00-18:00, and this trigger would still reject it with
-- "Bookings must be within business hours."
--
-- validate_booking_schedule() also does two OTHER checks in the same
-- function body (end time must be after start time; can't book into the
-- past) that were never asked to change -- copied verbatim from the live
-- source (pasted directly, not reconstructed) with only the business-hours
-- block removed, and both retain their original error codes (P0013, P0011)
-- so friendlyError()'s existing mapping in the frontend keeps working
-- unchanged.
--
-- Fires on both meetings INSERT and UPDATE (validate_booking_schedule_
-- before_insert unconditionally, validate_booking_schedule_before_update
-- only when date/start_time/end_time change) -- one function backs both
-- triggers, so this single edit covers fresh bookings, reschedules, and
-- admin reassignment/creation all at once.

BEGIN;

CREATE OR REPLACE FUNCTION public.validate_booking_schedule()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_now_local timestamp;
begin
  v_now_local := now() at time zone 'Asia/Kolkata';

  if NEW.end_time <= NEW.start_time then
    raise exception 'End time must be after start time.'
      using errcode = 'P0013';
  end if;

  if (NEW.date + NEW.start_time) < v_now_local then
    raise exception 'Cannot schedule a booking into a past date/time (% %).', NEW.date, NEW.start_time
      using errcode = 'P0011';
  end if;

  return NEW;
end;
$function$;

COMMIT;
