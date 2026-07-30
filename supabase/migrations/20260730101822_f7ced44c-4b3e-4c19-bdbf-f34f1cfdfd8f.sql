CREATE TABLE public.ncert_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  ncert_class integer NOT NULL CHECK (ncert_class IN (11, 12)),
  page_or_section_label text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ncert_sections TO anon, authenticated;
GRANT ALL ON public.ncert_sections TO service_role;
ALTER TABLE public.ncert_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "NCERT sections are public" ON public.ncert_sections FOR SELECT USING (true);
CREATE POLICY "Admins manage ncert sections" ON public.ncert_sections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_ncert_sections_topic ON public.ncert_sections(topic_id, order_index);

CREATE TABLE public.user_ncert_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ncert_section_id uuid NOT NULL REFERENCES public.ncert_sections(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ncert_section_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ncert_progress TO authenticated;
GRANT ALL ON public.user_ncert_progress TO service_role;
ALTER TABLE public.user_ncert_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ncert progress" ON public.user_ncert_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_user_ncert_progress_user ON public.user_ncert_progress(user_id);
CREATE TRIGGER trg_user_ncert_progress_updated BEFORE UPDATE ON public.user_ncert_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.priority_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  weightage numeric NOT NULL DEFAULT 0,
  mastery numeric NOT NULL DEFAULT 0,
  recency_multiplier numeric NOT NULL DEFAULT 1,
  reason text,
  driver text NOT NULL DEFAULT 'weightage',
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.priority_scores TO authenticated;
GRANT ALL ON public.priority_scores TO service_role;
ALTER TABLE public.priority_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own priority scores" ON public.priority_scores FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_priority_scores_user_score ON public.priority_scores(user_id, score DESC);

INSERT INTO public.ncert_sections (topic_id, ncert_class, page_or_section_label, order_index)
SELECT t.id,
       CASE WHEN c.class_level = 12 THEN 12 ELSE 11 END,
       COALESCE(NULLIF(t.ncert_reference, ''), c.name || ' — ' || t.name),
       t.sort_order
FROM public.topics t
JOIN public.chapters c ON c.id = t.chapter_id;