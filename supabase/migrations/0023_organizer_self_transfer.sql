-- 0023_organizer_self_transfer.sql
--
-- Requested directly: a meeting's own organizer should be able to hand the
-- meeting to someone else at any time, without needing an admin to do it
-- via Edit & Reassign. "Only one organizer" is already structurally
-- guaranteed -- booked_by_id is a single foreign key column, never a list
-- -- so this is purely about letting a non-admin write a NEW value there,
-- which is currently blocked in two independent places, both confirmed
-- against their live source (pasted directly, not reconstructed) before
-- writing this migration:
--
-- 1. RLS: bookings_update_own_or_admin's WITH CHECK was never set
--    explicitly, so Postgres reuses its USING clause -- evaluated against
--    the RESULTING row for an UPDATE. A transfer's resulting row has
--    booked_by_id = the new organizer, not the caller, so
--    "booked_by_id = auth.uid() OR is_admin()" would reject it outright,
--    before the trigger even runs. Fixed by giving the policy an explicit,
--    permissive WITH CHECK -- USING still gates which rows a non-admin can
--    even attempt to touch (must currently BE the organizer), and
--    protect_booking_columns() remains the real fine-grained authority
--    over which columns may actually change, matching the same "RLS for
--    row access, trigger for column-level protection" split already used
--    everywhere else in this schema.
--
-- 2. Trigger: protect_booking_columns() explicitly lists booked_by_id among
--    the columns a non-admin may never change. Simply removing it isn't
--    enough on its own, though -- set_booking_snapshots_trigger ALSO fires
--    on this same UPDATE and runs first (Postgres fires same-event triggers
--    in alphabetical order by trigger name: "set_booking_snapshots_trigger"
--    sorts before "trg_protect_booking_columns"), and it rewrites
--    booked_by_name/booked_by_email/booked_by_phone from the new
--    organizer's profile whenever booked_by_id changes (confirmed via its
--    live source). Left in protect_booking_columns()'s blocked list, those
--    three would still look like an unauthorized change and reject the
--    whole update even after booked_by_id itself is allowed through. All
--    four are removed from that list together.
--
-- Everything else a non-admin is blocked from touching (id, code, room_id,
-- room_name, room_location, purpose, attendees, reassigned_at,
-- reassigned_by_name, reassignment_reason, created_at) is untouched, as is
-- the existing "your own booking must not already be cancelled" and "you
-- may only cancel, never un-cancel" logic -- copied verbatim from the live
-- function body below, with only the booked_by_* lines removed.

BEGIN;

DROP POLICY IF EXISTS bookings_update_own_or_admin ON meetings;
CREATE POLICY bookings_update_own_or_admin ON meetings
  FOR UPDATE
  USING (booked_by_id = auth.uid() OR is_admin())
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.protect_booking_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  target_room public.rooms%rowtype;
begin
  if public.is_admin() then
    if new.room_id is distinct from old.room_id then
      select * into target_room from public.rooms where id = new.room_id;
      if not found then
        raise exception 'Room not found.';
      end if;
      if target_room.deleted_at is not null or target_room.status <> 'AVAILABLE' then
        raise exception '% is not available for booking right now.', target_room.name;
      end if;
    end if;
    return new;
  end if;

  if old.status = 'CANCELLED' then
    raise exception 'This booking has already been cancelled.';
  end if;

  if new.id is distinct from old.id
     or new.code is distinct from old.code
     or new.room_id is distinct from old.room_id
     or new.room_name is distinct from old.room_name
     or new.room_location is distinct from old.room_location
     or new.purpose is distinct from old.purpose
     or new.attendees is distinct from old.attendees
     or new.reassigned_at is distinct from old.reassigned_at
     or new.reassigned_by_name is distinct from old.reassigned_by_name
     or new.reassignment_reason is distinct from old.reassignment_reason
     or new.created_at is distinct from old.created_at
  then
    raise exception 'You may only cancel or reschedule your own booking.';
  end if;

  if new.status is distinct from old.status and new.status <> 'CANCELLED' then
    raise exception 'You may only cancel your own booking.';
  end if;

  return new;
end;
$function$;

COMMIT;
