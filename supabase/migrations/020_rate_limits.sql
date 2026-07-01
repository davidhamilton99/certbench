-- Postgres-backed fixed-window rate limiter.
-- Additive only: new table + function, no changes to existing objects.
-- Called via the service-role client from the API endpoint factory;
-- no RLS policies because the table is never exposed to user-scoped clients.

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count integer NOT NULL
);

ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;
-- No policies: anon/authenticated roles get nothing; service role bypasses RLS.

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_count integer;
BEGIN
  INSERT INTO rate_limit_buckets AS b (key, window_start, count)
  VALUES (p_key, v_now, 1)
  ON CONFLICT (key) DO UPDATE
    SET count = CASE
          WHEN b.window_start < v_now - make_interval(secs => p_window_seconds)
            THEN 1
          ELSE b.count + 1
        END,
        window_start = CASE
          WHEN b.window_start < v_now - make_interval(secs => p_window_seconds)
            THEN v_now
          ELSE b.window_start
        END
  RETURNING count INTO v_count;

  -- Opportunistic cleanup ~1% of calls: drop buckets idle for a day.
  IF random() < 0.01 THEN
    DELETE FROM rate_limit_buckets
    WHERE window_start < v_now - interval '1 day';
  END IF;

  RETURN v_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION check_rate_limit(text, integer, integer) FROM anon, authenticated;
