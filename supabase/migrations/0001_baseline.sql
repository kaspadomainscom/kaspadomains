-- 0001_baseline.sql
--
-- The baseline is `supabase/schema.sql` itself: listings, categories, the
-- many-to-many between them, votes, the vote-count view, per-domain links, and
-- RLS on all of it.
--
-- It is kept there rather than copied here so there is exactly one description
-- of the current schema. A copy would drift, and a drifted baseline is worse
-- than none: it looks authoritative while being wrong.
--
-- Run it, then continue with 0002.

\echo 'Run supabase/schema.sql for the baseline, then apply 0002 onward.'
