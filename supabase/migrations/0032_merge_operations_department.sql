-- "Operation" and "Operations" (in any casing) are the same real-world
-- department, split into two literal strings because department was free
-- text at the time these rows were written. Case-only variants ("QA" vs
-- "qa") are already merged for display by the frontend's
-- dedupeCaseInsensitive() helper, but a singular/plural pair like this is a
-- genuinely different string that helper can't catch — so, same as the
-- earlier "Development"/"development" cleanup, fix it at the data layer
-- once rather than trying to algorithmically detect every such pair.
-- "Operations" is kept as the canonical spelling (plural, the more standard
-- department name).

UPDATE profiles
SET department = 'Operations'
WHERE department ILIKE 'operation' OR department ILIKE 'operations';

UPDATE meetings
SET department = 'Operations'
WHERE department ILIKE 'operation' OR department ILIKE 'operations';
