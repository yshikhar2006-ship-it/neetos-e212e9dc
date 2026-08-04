-- Enums
CREATE TYPE public.paper_status AS ENUM ('queued', 'processing', 'needs_review', 'ready', 'failed');
CREATE TYPE public.paper_source_type AS ENUM ('pdf', 'images', 'camera');
CREATE TYPE public.paper_capture_method AS ENUM ('manual', 'wrong_only', 'omr_scan', 'answer_sheet_scan', 'answer_key_import');

-- paper_uploads
CREATE TABLE public.paper_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  coaching_institute TEXT,
  subject_id UUID REFERENCES public.subjects(id),
  status public.paper_status NOT NULL DEFAULT 'queued',
  source_type public.paper_source_type NOT NULL DEFAULT 'images',
  page_count INTEGER NOT NULL DEFAULT 0,
  marking_scheme JSONB NOT NULL DEFAULT '{"correct": 4, "incorrect": -1, "unattempted": 0}'::jsonb,
  total_time_seconds INTEGER,
  detected_language TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  folder TEXT,
  status_detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.paper_uploads TO authenticated;
GRANT ALL ON public.paper_uploads TO service_role;
ALTER TABLE public.paper_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own paper uploads" ON public.paper_uploads
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_paper_uploads_updated BEFORE UPDATE ON public.paper_uploads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_paper_uploads_user_status ON public.paper_uploads(user_id, status);

-- paper_pages
CREATE TABLE public.paper_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID NOT NULL REFERENCES public.paper_uploads(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  rotation INTEGER NOT NULL DEFAULT 0,
  perceptual_hash TEXT,
  extraction_status TEXT NOT NULL DEFAULT 'pending',
  extraction_cache JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.paper_pages TO authenticated;
GRANT ALL ON public.paper_pages TO service_role;
ALTER TABLE public.paper_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own paper pages" ON public.paper_pages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.paper_uploads p WHERE p.id = paper_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.paper_uploads p WHERE p.id = paper_id AND p.user_id = auth.uid()));

CREATE INDEX idx_paper_pages_paper ON public.paper_pages(paper_id, page_number);

-- paper_questions
CREATE TABLE public.paper_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID NOT NULL REFERENCES public.paper_uploads(id) ON DELETE CASCADE,
  page_id UUID REFERENCES public.paper_pages(id) ON DELETE SET NULL,
  position INTEGER NOT NULL,
  question_text TEXT NOT NULL DEFAULT '',
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_option INTEGER,
  detected_topic_id UUID REFERENCES public.topics(id),
  detected_subject_id UUID REFERENCES public.subjects(id),
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  field_confidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  needs_review BOOLEAN NOT NULL DEFAULT false,
  diagram_storage_path TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  marks NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.paper_questions TO authenticated;
GRANT ALL ON public.paper_questions TO service_role;
ALTER TABLE public.paper_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own paper questions" ON public.paper_questions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.paper_uploads p WHERE p.id = paper_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.paper_uploads p WHERE p.id = paper_id AND p.user_id = auth.uid()));

CREATE TRIGGER trg_paper_questions_updated BEFORE UPDATE ON public.paper_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_paper_questions_review ON public.paper_questions(paper_id, needs_review);

-- paper_answers
CREATE TABLE public.paper_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID NOT NULL REFERENCES public.paper_uploads(id) ON DELETE CASCADE,
  paper_question_id UUID NOT NULL REFERENCES public.paper_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_option INTEGER,
  marked_for_review BOOLEAN NOT NULL DEFAULT false,
  capture_method public.paper_capture_method NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (paper_question_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.paper_answers TO authenticated;
GRANT ALL ON public.paper_answers TO service_role;
ALTER TABLE public.paper_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own paper answers" ON public.paper_answers
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_paper_answers_updated BEFORE UPDATE ON public.paper_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_paper_answers_paper ON public.paper_answers(paper_id);

-- Integration column on existing test_attempts
ALTER TABLE public.test_attempts
  ADD COLUMN paper_upload_id UUID REFERENCES public.paper_uploads(id) ON DELETE SET NULL;
CREATE INDEX idx_test_attempts_paper_upload ON public.test_attempts(paper_upload_id);

-- Realtime for live processing status
ALTER PUBLICATION supabase_realtime ADD TABLE public.paper_uploads;