ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_score integer NOT NULL DEFAULT 650,
  ADD COLUMN IF NOT EXISTS target_college text,
  ADD COLUMN IF NOT EXISTS daily_study_hours integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS coaching_enrolled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS weak_subjects text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS strong_subjects text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS study_style text NOT NULL DEFAULT 'mixed';