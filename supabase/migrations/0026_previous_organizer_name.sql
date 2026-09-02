-- 0026_previous_organizer_name.sql
--
-- Requested directly: the "Organizer transferred..." banner should show WHO
-- it was transferred FROM, not who it's now organized by (the current
-- organizer is already shown elsewhere on the page, so restating it there
-- was redundant).
--
-- previous_organizer_name is captured by set_booking_snapshots() -- the
-- same trigger that already rewrites booked_by_name/email/phone whenever
-- booked_by_id changes -- rather than trusted from the client, so it's
-- always exactly whatever the row's own booked_by_name was a moment
-- before, not something a caller could get wrong or fake. Only set on
-- UPDATE (there's no "previous" organizer on a brand-new booking's INSERT).
-- Copied from the live source pasted earlier in this session, with just
-- that one addition.

BEGIN;

ALTER TABLE meetings ADD COLUMN previous_organizer_name text;

CREATE OR REPLACE FUNCTION public.set_booking_snapshots()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r public.rooms%rowtype;
  p public.profiles%rowtype;
begin
  if new.room_id is not null and (tg_op = 'INSERT' or new.room_id is distinct from old.room_id) then
    select * into r from public.rooms where id = new.room_id;
    if found then
      new.room_name := r.name;
      new.room_location := r.location;
    end if;
  end if;
  if new.booked_by_id is not null and (tg_op = 'INSERT' or new.booked_by_id is distinct from old.booked_by_id) then
    if tg_op = 'UPDATE' then
      new.previous_organizer_name := old.booked_by_name;
    end if;
    select * into p from public.profiles where id = new.booked_by_id;
    if found then
      new.booked_by_name := p.name;
      new.booked_by_email := p.email;
      new.booked_by_phone := p.phone;
    end if;
  end if;
  return new;
end;
$function$;

COMMIT;
