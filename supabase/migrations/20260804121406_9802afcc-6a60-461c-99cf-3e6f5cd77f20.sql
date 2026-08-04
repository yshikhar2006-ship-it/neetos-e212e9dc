ALTER TABLE public.test_answers ALTER COLUMN question_id DROP NOT NULL;

ALTER TABLE public.test_answers
  ADD COLUMN paper_question_id UUID REFERENCES public.paper_questions(id) ON DELETE CASCADE;

CREATE INDEX idx_test_answers_paper_question ON public.test_answers(paper_question_id);

ALTER TABLE public.test_answers
  ADD CONSTRAINT test_answers_question_source_chk
  CHECK (question_id IS NOT NULL OR paper_question_id IS NOT NULL);