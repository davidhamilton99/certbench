-- Atomic increment for AI generation usage counter
-- Prevents race conditions when concurrent requests try to increment the same row.
CREATE OR REPLACE FUNCTION increment_generation_count(p_user_id uuid, p_month text)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO ai_generation_usage (user_id, month, generation_count)
  VALUES (p_user_id, p_month, 1)
  ON CONFLICT (user_id, month)
  DO UPDATE SET generation_count = ai_generation_usage.generation_count + 1;
$$;
