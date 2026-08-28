-- 0016_employee_id_unique_and_phone_format.sql
--
-- Two new data-integrity rules for profiles, requested directly: employee ID
-- must be unique across all users, and phone number must start with "+"
-- followed by digits, with a +91 number required to have exactly 10 digits
-- after the prefix (other country codes are otherwise unconstrained).
--
-- Live data already has real violations of both rules (checked before writing
-- this): employee_id has 3 sets of duplicates (EMP-9013 x2, EMP-2050 x3,
-- EMP-1001 x2) and phone has several malformed values (missing "+", spaces,
-- wrong digit counts, one empty string). A plain UNIQUE/CHECK constraint
-- would either fail outright when applied, or — per this project's own
-- established lesson from the business-hours CHECK-constraint incident —
-- silently turn any future unrelated edit to one of these existing rows into
-- a hard failure, since Postgres re-validates a CHECK/UNIQUE constraint on
-- every write regardless of which column actually changed.
--
-- So instead of a real constraint, this is trigger-based and only fires when
-- the relevant column is actually part of the write: always on INSERT, and
-- on UPDATE only when that specific column's value changes (WHEN clause).
-- A legacy duplicate/malformed row can still be edited freely (name,
-- department, etc.) without being blocked by its own pre-existing employee_id
-- or phone value — it only becomes an error if someone actively tries to set
-- employee_id/phone to something that violates the rule from that point on.

BEGIN;

CREATE OR REPLACE FUNCTION validate_profile_employee_id_unique()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
begin
  if NEW.employee_id is not null and NEW.employee_id <> '' then
    if EXISTS (
      SELECT 1 FROM profiles WHERE employee_id = NEW.employee_id AND id <> NEW.id
    ) then
      RAISE EXCEPTION 'This employee ID is already in use by another user.'
        USING ERRCODE = 'unique_violation';
    end if;
  end if;
  return NEW;
end;
$function$;

CREATE TRIGGER validate_profile_employee_id_unique_before_insert
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION validate_profile_employee_id_unique();

CREATE TRIGGER validate_profile_employee_id_unique_before_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.employee_id IS DISTINCT FROM NEW.employee_id)
  EXECUTE FUNCTION validate_profile_employee_id_unique();

CREATE OR REPLACE FUNCTION validate_profile_phone_format()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
begin
  if NEW.phone is not null and NEW.phone <> '' then
    if NEW.phone ~ '^\+91' then
      if NEW.phone !~ '^\+91\d{10}$' then
        RAISE EXCEPTION 'A +91 phone number must have exactly 10 digits after it.'
          USING ERRCODE = 'check_violation';
      end if;
    elsif NEW.phone !~ '^\+\d+$' then
      RAISE EXCEPTION 'Phone number must start with + followed only by digits (no spaces or symbols).'
        USING ERRCODE = 'check_violation';
    end if;
  end if;
  return NEW;
end;
$function$;

CREATE TRIGGER validate_profile_phone_format_before_insert
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION validate_profile_phone_format();

CREATE TRIGGER validate_profile_phone_format_before_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.phone IS DISTINCT FROM NEW.phone)
  EXECUTE FUNCTION validate_profile_phone_format();

COMMIT;
