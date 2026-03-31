<div align="center">

# QuizCraft AI

**An AI-powered quiz platform for teachers and students**

React · Node.js · Express · PostgreSQL (Supabase) · JWT · Tailwind CSS · Recharts · Google Gemini

</div>

---

## Overview

QuizCraft AI is a full-stack web application that lets teachers create and assign quizzes — either manually or generated from a document using Google Gemini AI — and allows students to take those quizzes, see their scores, and track their progress over time.

The system uses **role-based authentication** with separate teacher and student dashboards, routes, and permissions. Self-registration is currently enabled for teacher accounts only. Data persistence is powered by Supabase PostgreSQL.

---

## Features

### 👩‍🏫 Teacher
- Generate quizzes from uploaded PDF or TXT documents using Google Gemini AI
- Build quizzes manually with a step-by-step question editor
- Edit questions, options, and correct answers after creation
- Publish / unpublish quizzes (draft mode by default)
- Assign quizzes to individual students with an optional due date
- View quiz analytics: completion rate, average score, score distribution chart, per-student results table
- Optional Supabase analytics payloads (RPC-backed) for dashboard, quizzes, and quiz analytics

### 👨‍🎓 Student
- View all quizzes assigned to them with status and due date
- Take quizzes with a countdown timer (if set), auto-save, and a question navigator
- Submit and receive an instant score with per-question feedback
- Review past attempt results and history
- Visitor-ready quiz access flow (Supabase RPC + Edge Function scaffolding)

### 🔐 Auth & System
- Teacher self-registration (student self-registration disabled)
- JWT authentication — token stored in localStorage, attached on every request
- Email verification and password reset via email
- In-app notifications (quiz assigned, quiz submitted)
- Rate limiting on sensitive endpoints
- Supabase schema + RLS policies + analytics views (optional)
- Storage policies for quiz documents and student photos (optional)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Backend | Node.js, Express |
| Database | PostgreSQL (Supabase) |
| Authentication | JWT (jsonwebtoken) |
| Password Hashing | bcryptjs |
| File Uploads | Multer (PDF/TXT, max 5MB) |
| AI Generation | Google Gemini 2.5 Flash |
| Email | Nodemailer |

---

## Project Structure

```
quizcraft-react/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.js          # register, login, logout, email verify, password reset
│   │   │   ├── assignment.js    # assign quizzes to students, list, revoke
│   │   │   ├── attempt.js       # start/resume attempt, save answers, submit, results
│   │   │   ├── notification.js  # list and mark notifications as read
│   │   │   ├── profile.js       # update profile, change password, delete account
│   │   │   └── quiz.js          # CRUD, AI generate, question editor, analytics
│   │   ├── middleware/
│   │   │   └── auth.js          # authenticate, requireTeacher, requireStudent, requireVerified
│   │   ├── routes/
│   │   │   ├── auth.js          # /api/auth/* routes
│   │   │   └── api.js           # all protected routes
│   │   ├── services/
│   │   │   ├── gemini.js        # Gemini API call + response parsing
│   │   │   └── mail.js          # password reset and verification emails
│   │   │   └── supabase.js       # Optional Supabase client (RPC reads)
│   │   ├── db.js                # PostgreSQL helpers (dbGet, dbAll, dbRun)
│   │   ├── index.js             # Express entry point, CORS, rate limiting
│   │   └── migrate.js           # Creates all 11 database tables
│   ├── .env.example
│   └── package.json
│
└── frontend/
    └── src/
        ├── components/
        │   ├── AppLayout.jsx          # Nav, role badge, notification bell, user dropdown
        │   ├── GuestLayout.jsx        # Centered card for auth pages
        │   ├── charts/
        │   │   ├── ScoreBarChart.jsx       # Recharts bar chart — score distribution
        │   │   └── CompletionPieChart.jsx  # Recharts donut chart — completion rate
        │   └── quiz/
        │       ├── QuestionCard.jsx        # MC / True-False / Enumeration question renderer
        │       └── QuizTimer.jsx           # Countdown timer with sessionStorage persistence
        ├── contexts/
        │   └── AuthContext.jsx        # User state, JWT, isTeacher/isStudent helpers
        └── pages/
            ├── auth/                  # Login, Register, ForgotPassword, ResetPassword, VerifyEmail
            ├── teacher/
            │   ├── Dashboard.jsx          # Stats cards + recent quizzes table
            │   └── quizzes/
            │       ├── QuizList.jsx       # All quizzes with publish/assign/analytics/delete
            │       ├── GenerateQuiz.jsx   # AI generation form (upload + section builder)
            │       ├── CreateQuiz.jsx     # Manual quiz builder (step-by-step)
            │       ├── EditQuiz.jsx       # Accordion question editor
            │       ├── AssignQuiz.jsx     # Student picker with due date
            │       └── QuizAnalytics.jsx  # Charts + student results table
            ├── student/
            │   ├── Dashboard.jsx          # Assigned quizzes + stats
            │   ├── quizzes/
            │   │   ├── QuizPage.jsx       # Active quiz with timer, navigator, auto-save
            │   │   └── QuizResult.jsx     # Score + per-question breakdown
            │   └── history/
            │       └── AttemptHistory.jsx # All past attempts
            └── shared/
                └── Profile.jsx            # Edit name/email, change password, delete account

supabase/
├── migrations/
│   ├── 001_init_schema.sql      # Supabase schema + RLS + RPC helpers
│   ├── 002_analytics_views.sql  # Analytics views and materialized stats
│   ├── 003_storage_policies.sql # Storage buckets + policies
│   └── 004_rpc_api.sql          # RPC endpoints for dashboard/quiz/analytics
└── functions/
    ├── start-attempt/           # Visitor attempt creation by token
    ├── save-answer/             # Visitor answer save by token
    ├── sign-photo-upload/       # Signed upload for student photos
    └── get-quiz-by-token/        # Load quiz by share token
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Google Gemini API key — get one free at [aistudio.google.com](https://aistudio.google.com)
- An SMTP server for emails (or use a service like Mailtrap for local testing)

### 1. Clone / Extract the project

```bash
cd quizcraft-react
```

### 2. Set up the backend

```bash
cd backend
npm install
cp .env.example .env
```

> Run the copy command only once on first setup. Recopying later will overwrite `backend/.env` and can bring back placeholder values that break `npm run migrate`.

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Open `.env` and fill in your values (see [Environment Variables](#environment-variables) below), then run the database migration:

```bash
npm run migrate
```

Start the development server:

```bash
npm run dev
# Runs on http://localhost:3001
```

### 3. Set up the frontend

```bash
cd ../frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Configure Supabase PostgreSQL

This project uses Supabase PostgreSQL for backend persistence.

1) Create a Supabase project and get:
- `DATABASE_URL` (or `SUPABASE_DB_URL`) from the project database connection settings
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

2) Apply migrations (Supabase CLI or SQL editor), in order:
- [supabase/migrations/001_init_schema.sql](supabase/migrations/001_init_schema.sql)
- [supabase/migrations/002_analytics_views.sql](supabase/migrations/002_analytics_views.sql)
- [supabase/migrations/003_storage_policies.sql](supabase/migrations/003_storage_policies.sql)
- [supabase/migrations/004_rpc_api.sql](supabase/migrations/004_rpc_api.sql)

3) Deploy Edge Functions:
- `start-attempt`
- `save-answer`
- `sign-photo-upload`
- `get-quiz-by-token`

4) Set backend env vars and restart:
- `DATABASE_URL=postgresql://...`
- `SUPABASE_DB_URL=` (optional alias)
- `DB_SSL=true`

5) Optional RPC read mode (if you want Supabase RPC-backed reads in selected endpoints):
- `USE_SUPABASE=true`
- `SUPABASE_URL=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`

---

## Environment Variables

Create `backend/.env` using `.env.example` as a template:

```env
# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# JWT
JWT_SECRET=a_long_random_secret_string
JWT_EXPIRES_IN=7d

# App
PORT=3001
# For Render production, set this to your Vercel frontend URL
APP_URL=https://your-frontend.vercel.app

# Database (PostgreSQL / Supabase)
DATABASE_URL=postgresql://postgres:<password>@<project-ref>.supabase.co:6543/postgres
SUPABASE_DB_URL=
DB_SSL=true

# Supabase (optional)
USE_SUPABASE=false
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Email (SMTP)
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=your_email@example.com
MAIL_PASS=your_email_password
MAIL_FROM=noreply@example.com
```

> **Tip for local testing:** Use [Mailtrap](https://mailtrap.io) — it gives you free SMTP credentials that capture all outgoing emails without actually sending them.

---

## API Reference

All endpoints are prefixed with `/api`. Protected routes require an `Authorization: Bearer <token>` header.

#### Auth — `/api/auth`
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| POST | `/auth/logout` | Any |
| GET | `/auth/user` | Any |
| POST | `/auth/forgot-password` | Public |
| POST | `/auth/reset-password` | Public |
| GET | `/auth/verify-email/:token` | Public |
| POST | `/auth/resend-verification` | Any |

#### Quizzes — Teacher only
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quizzes` | List teacher's quizzes |
| POST | `/api/quizzes/generate` | Generate quiz via AI (multipart) |
| POST | `/api/quizzes/manual` | Create empty quiz manually |
| GET | `/api/quizzes/:id` | Get quiz with questions |
| PATCH | `/api/quizzes/:id` | Update title / settings |
| POST | `/api/quizzes/:id/publish` | Toggle publish/draft |
| DELETE | `/api/quizzes/:id` | Delete quiz |
| POST | `/api/quizzes/:id/questions` | Add a question |
| PUT | `/api/quizzes/:id/questions/:qid` | Update a question |
| DELETE | `/api/quizzes/:id/questions/:qid` | Delete a question |
| GET | `/api/quizzes/:id/analytics` | Full analytics data |
| GET | `/api/dashboard/stats` | Teacher overview stats |

#### Assignments
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/assignments` | Teacher: all · Student: mine |
| POST | `/api/assignments` | Teacher only |
| DELETE | `/api/assignments/:id` | Teacher only |
| GET | `/api/students` | Teacher only — list all students |

#### Quiz Taking — Student only
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assignments/:assignmentId/attempt` | Start or resume attempt |
| PUT | `/api/attempts/:id/answers` | Auto-save answers |
| POST | `/api/attempts/:id/submit` | Submit and score attempt |
| GET | `/api/attempts/:id/result` | Get scored result |
| GET | `/api/attempts/history` | All past attempts |

#### Profile & Notifications
| Method | Endpoint |
|--------|----------|
| PATCH | `/api/profile` |
| PUT | `/api/profile/password` |
| DELETE | `/api/profile` |
| GET | `/api/notifications` |
| POST | `/api/notifications/read` |

---

## Database Schema

11 tables — all created by `npm run migrate`:

```
users               id, name, email, password, role, email_verified_at
password_reset_tokens
quizzes             id, user_id (FK), title, description, source_type, file_path,
                    time_limit, total_questions, is_published, sections_config, ai_response
questions           id, quiz_id (FK), question_text, question_type, correct_answer, order_index
options             id, question_id (FK), option_text, option_label, order_index
quiz_assignments    id, quiz_id (FK), student_id (FK), assigned_by (FK), due_date, status
attempts            id, assignment_id (FK), student_id (FK), quiz_id (FK),
                    score, total_correct, time_taken, started_at, submitted_at, status
answers             id, attempt_id (FK), question_id (FK), selected_option_id, answer_text, is_correct
guest_attempts      id, quiz_id (FK), attempt_token, student_display_name, score, status
guest_answers       id, guest_attempt_id (FK), question_id (FK), answer_text, is_correct
notifications       id, user_id (FK), type, message, is_read
```

## Supabase Notes (Optional)

- Supabase RPCs power analytics and teacher dashboard reads when `USE_SUPABASE=true`.
- Visitor quiz access is scaffolded via Edge Functions and RPCs for token-based flow.
- Storage policies support quiz documents and student photos with signed uploads.

---

## How Quiz Taking Works

1. Student clicks **Start** → `GET /api/assignments/:assignmentId/attempt` creates or resumes an attempt with `status = in_progress`
2. All questions load into `QuizPage` with the question navigator sidebar
3. Every answer change triggers a **1.5s debounced auto-save** via `PUT /attempts/:id/answers`
4. If a time limit is set, `QuizTimer` counts down and **auto-submits on expiry** — remaining time is persisted in `sessionStorage` so a page refresh doesn't reset it
5. Student clicks **Submit** → answers are saved one final time, then `POST /attempts/:id/submit` scores the attempt server-side
6. Server compares each answer against `questions.correct_answer`, sets `answers.is_correct`, calculates `score`, updates `quiz_assignments.status = completed`, and sends a notification to the teacher
7. Student is redirected to `QuizResult` showing their score and a per-question breakdown

---

## Question Types

| Type | Input | Scoring |
|------|-------|---------|
| Multiple Choice | Radio buttons (A B C D) | Option label matched against `correct_answer` |
| True or False | Two toggle buttons | Text matched case-insensitively |
| Enumeration | Free-text input | Text matched case-insensitively (trimmed) |

---

## Available Scripts

**Backend**
```bash
npm run dev       # Start with nodemon (auto-reload)
npm run start     # Start without nodemon
npm run migrate   # Create / upgrade database tables
```

**Frontend**
```bash
npm run dev       # Start Vite dev server
npm run build     # Production build → dist/
npm run preview   # Preview the production build
```

---

## Notes

- The frontend Vite dev server proxies `/api` requests to `http://localhost:3001` — see `vite.config.js`
- Uploaded documents are stored in `backend/uploads/` and are deleted when their quiz is deleted
- Quiz generation can take 15–60 seconds depending on document size and Gemini response time — the UI shows a spinner while waiting
- JWT tokens expire after 7 days by default (configurable via `JWT_EXPIRES_IN`)
- The `role` field is set at registration and cannot be changed through the UI
