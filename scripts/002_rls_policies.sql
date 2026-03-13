-- QuizCraft AI Row Level Security Policies
-- Run this after 001_create_tables.sql

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PROFILES POLICIES
-- =============================================
-- Users can view their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can insert their own profile
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- =============================================
-- SUBSCRIPTIONS POLICIES
-- =============================================
-- Users can view their own subscription
DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
CREATE POLICY "subscriptions_select_own" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own subscription (for initial creation)
DROP POLICY IF EXISTS "subscriptions_insert_own" ON public.subscriptions;
CREATE POLICY "subscriptions_insert_own" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscription
DROP POLICY IF EXISTS "subscriptions_update_own" ON public.subscriptions;
CREATE POLICY "subscriptions_update_own" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- QUIZZES POLICIES
-- =============================================
-- Users can view their own quizzes
DROP POLICY IF EXISTS "quizzes_select_own" ON public.quizzes;
CREATE POLICY "quizzes_select_own" ON public.quizzes
  FOR SELECT USING (auth.uid() = user_id);

-- Anyone can view published quizzes with share_code (for guest access)
DROP POLICY IF EXISTS "quizzes_select_published" ON public.quizzes;
CREATE POLICY "quizzes_select_published" ON public.quizzes
  FOR SELECT USING (is_published = TRUE AND share_code IS NOT NULL);

-- Users can insert their own quizzes
DROP POLICY IF EXISTS "quizzes_insert_own" ON public.quizzes;
CREATE POLICY "quizzes_insert_own" ON public.quizzes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own quizzes
DROP POLICY IF EXISTS "quizzes_update_own" ON public.quizzes;
CREATE POLICY "quizzes_update_own" ON public.quizzes
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own quizzes
DROP POLICY IF EXISTS "quizzes_delete_own" ON public.quizzes;
CREATE POLICY "quizzes_delete_own" ON public.quizzes
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- QUESTIONS POLICIES
-- =============================================
-- Users can view questions for their own quizzes
DROP POLICY IF EXISTS "questions_select_own" ON public.questions;
CREATE POLICY "questions_select_own" ON public.questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE quizzes.id = questions.quiz_id 
      AND quizzes.user_id = auth.uid()
    )
  );

-- Anyone can view questions for published quizzes
DROP POLICY IF EXISTS "questions_select_published" ON public.questions;
CREATE POLICY "questions_select_published" ON public.questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE quizzes.id = questions.quiz_id 
      AND quizzes.is_published = TRUE 
      AND quizzes.share_code IS NOT NULL
    )
  );

-- Users can insert questions for their own quizzes
DROP POLICY IF EXISTS "questions_insert_own" ON public.questions;
CREATE POLICY "questions_insert_own" ON public.questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE quizzes.id = questions.quiz_id 
      AND quizzes.user_id = auth.uid()
    )
  );

-- Users can update questions for their own quizzes
DROP POLICY IF EXISTS "questions_update_own" ON public.questions;
CREATE POLICY "questions_update_own" ON public.questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE quizzes.id = questions.quiz_id 
      AND quizzes.user_id = auth.uid()
    )
  );

-- Users can delete questions for their own quizzes
DROP POLICY IF EXISTS "questions_delete_own" ON public.questions;
CREATE POLICY "questions_delete_own" ON public.questions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE quizzes.id = questions.quiz_id 
      AND quizzes.user_id = auth.uid()
    )
  );

-- =============================================
-- OPTIONS POLICIES
-- =============================================
-- Users can view options for their own questions
DROP POLICY IF EXISTS "options_select_own" ON public.options;
CREATE POLICY "options_select_own" ON public.options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      JOIN public.quizzes qz ON qz.id = q.quiz_id
      WHERE q.id = options.question_id 
      AND qz.user_id = auth.uid()
    )
  );

-- Anyone can view options for published quiz questions
DROP POLICY IF EXISTS "options_select_published" ON public.options;
CREATE POLICY "options_select_published" ON public.options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      JOIN public.quizzes qz ON qz.id = q.quiz_id
      WHERE q.id = options.question_id 
      AND qz.is_published = TRUE 
      AND qz.share_code IS NOT NULL
    )
  );

-- Users can insert options for their own questions
DROP POLICY IF EXISTS "options_insert_own" ON public.options;
CREATE POLICY "options_insert_own" ON public.options
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.questions q
      JOIN public.quizzes qz ON qz.id = q.quiz_id
      WHERE q.id = options.question_id 
      AND qz.user_id = auth.uid()
    )
  );

-- Users can update options for their own questions
DROP POLICY IF EXISTS "options_update_own" ON public.options;
CREATE POLICY "options_update_own" ON public.options
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      JOIN public.quizzes qz ON qz.id = q.quiz_id
      WHERE q.id = options.question_id 
      AND qz.user_id = auth.uid()
    )
  );

-- Users can delete options for their own questions
DROP POLICY IF EXISTS "options_delete_own" ON public.options;
CREATE POLICY "options_delete_own" ON public.options
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      JOIN public.quizzes qz ON qz.id = q.quiz_id
      WHERE q.id = options.question_id 
      AND qz.user_id = auth.uid()
    )
  );

-- =============================================
-- QUIZ ATTEMPTS POLICIES
-- =============================================
-- Quiz owners can view attempts for their quizzes
DROP POLICY IF EXISTS "attempts_select_owner" ON public.quiz_attempts;
CREATE POLICY "attempts_select_owner" ON public.quiz_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE quizzes.id = quiz_attempts.quiz_id 
      AND quizzes.user_id = auth.uid()
    )
  );

-- Users can view their own attempts
DROP POLICY IF EXISTS "attempts_select_own" ON public.quiz_attempts;
CREATE POLICY "attempts_select_own" ON public.quiz_attempts
  FOR SELECT USING (user_id = auth.uid());

-- Anyone can insert attempts (for guest mode on published quizzes)
DROP POLICY IF EXISTS "attempts_insert_guest" ON public.quiz_attempts;
CREATE POLICY "attempts_insert_guest" ON public.quiz_attempts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE quizzes.id = quiz_attempts.quiz_id 
      AND quizzes.is_published = TRUE 
      AND quizzes.share_code IS NOT NULL
    )
  );

-- Authenticated users can insert attempts for any quiz they have access to
DROP POLICY IF EXISTS "attempts_insert_auth" ON public.quiz_attempts;
CREATE POLICY "attempts_insert_auth" ON public.quiz_attempts
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

-- Anyone can update their own attempts (for submission)
DROP POLICY IF EXISTS "attempts_update_own" ON public.quiz_attempts;
CREATE POLICY "attempts_update_own" ON public.quiz_attempts
  FOR UPDATE USING (
    user_id = auth.uid() OR user_id IS NULL
  );

-- =============================================
-- ANSWERS POLICIES
-- =============================================
-- Quiz owners can view answers for their quiz attempts
DROP POLICY IF EXISTS "answers_select_owner" ON public.answers;
CREATE POLICY "answers_select_owner" ON public.answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts a
      JOIN public.quizzes q ON q.id = a.quiz_id
      WHERE a.id = answers.attempt_id 
      AND q.user_id = auth.uid()
    )
  );

-- Users can view their own answers
DROP POLICY IF EXISTS "answers_select_own" ON public.answers;
CREATE POLICY "answers_select_own" ON public.answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts 
      WHERE quiz_attempts.id = answers.attempt_id 
      AND quiz_attempts.user_id = auth.uid()
    )
  );

-- Anyone can insert answers (for guest mode)
DROP POLICY IF EXISTS "answers_insert_guest" ON public.answers;
CREATE POLICY "answers_insert_guest" ON public.answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts a
      JOIN public.quizzes q ON q.id = a.quiz_id
      WHERE a.id = answers.attempt_id 
      AND q.is_published = TRUE 
      AND q.share_code IS NOT NULL
    )
  );

-- Authenticated users can insert their own answers
DROP POLICY IF EXISTS "answers_insert_auth" ON public.answers;
CREATE POLICY "answers_insert_auth" ON public.answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts 
      WHERE quiz_attempts.id = answers.attempt_id 
      AND quiz_attempts.user_id = auth.uid()
    )
  );

-- Anyone can update answers for their attempt (for changing answers before submission)
DROP POLICY IF EXISTS "answers_update_own" ON public.answers;
CREATE POLICY "answers_update_own" ON public.answers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts 
      WHERE quiz_attempts.id = answers.attempt_id 
      AND (quiz_attempts.user_id = auth.uid() OR quiz_attempts.user_id IS NULL)
      AND quiz_attempts.is_submitted = FALSE
    )
  );
