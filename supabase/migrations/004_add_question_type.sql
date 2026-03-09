-- Add question_type column to support multiple question formats
ALTER TABLE public.user_study_questions
ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'multiple_choice'
  CHECK (question_type IN ('multiple_choice', 'true_false', 'multiple_select', 'ordering', 'matching'));
