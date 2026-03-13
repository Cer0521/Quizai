-- QuizCraft AI Database Schema - Core Tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES TABLE (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'teacher' CHECK (role IN ('teacher', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'enterprise')),
  quiz_count_this_period INTEGER DEFAULT 0,
  period_start TIMESTAMPTZ DEFAULT NOW(),
  period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES public.profiles(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- QUIZZES TABLE
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  time_limit INTEGER,
  share_code TEXT UNIQUE,
  is_published BOOLEAN DEFAULT FALSE,
  allow_retakes BOOLEAN DEFAULT TRUE,
  shuffle_questions BOOLEAN DEFAULT FALSE,
  show_correct_answers BOOLEAN DEFAULT TRUE,
  passing_score INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'true_false', 'enumeration', 'essay')),
  question_text TEXT NOT NULL,
  correct_answer TEXT,
  points INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OPTIONS TABLE (for multiple choice questions)
CREATE TABLE IF NOT EXISTS public.options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0
);

-- QUIZ ATTEMPTS TABLE (supports guest mode)
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  student_name TEXT,
  student_email TEXT,
  student_photo_url TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  score INTEGER,
  total_points INTEGER,
  earned_points INTEGER,
  time_spent INTEGER,
  is_submitted BOOLEAN DEFAULT FALSE,
  ip_address TEXT,
  user_agent TEXT
);

-- ANSWERS TABLE
CREATE TABLE IF NOT EXISTS public.answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  selected_option_id UUID REFERENCES public.options(id),
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  ai_feedback TEXT,
  ai_score INTEGER,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
