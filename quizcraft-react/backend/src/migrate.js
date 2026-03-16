require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!DATABASE_URL) {
  console.error('Missing DIRECT_URL or DATABASE_URL (or SUPABASE_DB_URL) in environment.');
  process.exit(1);
}

if (/[<>\[\]]/.test(DATABASE_URL) || /YOUR_DB_PASSWORD|YOUR-PASSWORD|project-ref/i.test(DATABASE_URL)) {
  console.error('Invalid DATABASE_URL: placeholder values detected. Set a real Supabase Postgres URL first.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
});

async function run(sql, label) {
  try {
    await pool.query(sql);
    console.log(`\u2713 ${label}`);
  } catch (err) {
    console.error(`Error: ${label} - ${err.message}`);
    throw err;
  }
}

async function ensureColumn(tableName, columnName, alterSql) {
  const { rows } = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     LIMIT 1`,
    [tableName, columnName]
  );

  if (rows.length === 0) {
    await run(alterSql, `${tableName}.${columnName} column`);
  }
}

async function migrate() {
  await run('CREATE EXTENSION IF NOT EXISTS pgcrypto', 'pgcrypto extension');

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      email_verified_at TIMESTAMPTZ NULL,
      remember_token TEXT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`, 'users');

  await ensureColumn('users', 'role', `ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'student'`);

  await run(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      email TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`, 'password_reset_tokens');

  await run(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NULL,
      source_type TEXT NOT NULL DEFAULT 'ai',
      file_path TEXT NULL,
      time_limit INTEGER NULL,
      total_questions INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 0,
      share_token TEXT NULL,
      show_score INTEGER NOT NULL DEFAULT 1,
      sections_config TEXT NULL,
      ai_response TEXT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT quizzes_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`, 'quizzes');

  await ensureColumn('quizzes', 'description', `ALTER TABLE quizzes ADD COLUMN description TEXT NULL`);
  await ensureColumn('quizzes', 'source_type', `ALTER TABLE quizzes ADD COLUMN source_type TEXT NOT NULL DEFAULT 'ai'`);
  await ensureColumn('quizzes', 'time_limit', `ALTER TABLE quizzes ADD COLUMN time_limit INTEGER NULL`);
  await ensureColumn('quizzes', 'is_published', `ALTER TABLE quizzes ADD COLUMN is_published INTEGER NOT NULL DEFAULT 0`);
  await ensureColumn('quizzes', 'share_token', `ALTER TABLE quizzes ADD COLUMN share_token TEXT NULL`);
  await ensureColumn('quizzes', 'show_score', `ALTER TABLE quizzes ADD COLUMN show_score INTEGER NOT NULL DEFAULT 1`);

  await run(`
    CREATE TABLE IF NOT EXISTS questions (
      id BIGSERIAL PRIMARY KEY,
      quiz_id BIGINT NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL DEFAULT 'multiple_choice',
      correct_answer TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT questions_quiz_fk FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    )`, 'questions');

  await run(`
    CREATE TABLE IF NOT EXISTS options (
      id BIGSERIAL PRIMARY KEY,
      question_id BIGINT NOT NULL,
      option_text TEXT NOT NULL,
      option_label TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT options_question_fk FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )`, 'options');

  await run(`
    CREATE TABLE IF NOT EXISTS quiz_assignments (
      id BIGSERIAL PRIMARY KEY,
      quiz_id BIGINT NOT NULL,
      student_id BIGINT NOT NULL,
      assigned_by BIGINT NOT NULL,
      due_date TIMESTAMPTZ NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      assigned_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT quiz_assignments_quiz_fk FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
      CONSTRAINT quiz_assignments_student_fk FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT quiz_assignments_assigned_by_fk FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT quiz_assignments_unique UNIQUE (quiz_id, student_id)
    )`, 'quiz_assignments');

  await run(`
    CREATE TABLE IF NOT EXISTS attempts (
      id BIGSERIAL PRIMARY KEY,
      assignment_id BIGINT NOT NULL,
      student_id BIGINT NOT NULL,
      quiz_id BIGINT NOT NULL,
      score NUMERIC(10,2) NULL,
      total_correct INTEGER NOT NULL DEFAULT 0,
      time_taken INTEGER NULL,
      student_display_name TEXT NULL,
      photo_data TEXT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      submitted_at TIMESTAMPTZ NULL,
      status TEXT NOT NULL DEFAULT 'in_progress',
      CONSTRAINT attempts_assignment_fk FOREIGN KEY (assignment_id) REFERENCES quiz_assignments(id) ON DELETE CASCADE,
      CONSTRAINT attempts_student_fk FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT attempts_quiz_fk FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    )`, 'attempts');

  await run(`
    CREATE TABLE IF NOT EXISTS answers (
      id BIGSERIAL PRIMARY KEY,
      attempt_id BIGINT NOT NULL,
      question_id BIGINT NOT NULL,
      selected_option_id BIGINT NULL,
      answer_text TEXT NULL,
      is_correct INTEGER NOT NULL DEFAULT 0,
      ai_feedback TEXT NULL,
      CONSTRAINT answers_attempt_fk FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
      CONSTRAINT answers_question_fk FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )`, 'answers');

  await ensureColumn('answers', 'ai_feedback', `ALTER TABLE answers ADD COLUMN ai_feedback TEXT NULL`);
  await ensureColumn('attempts', 'student_display_name', `ALTER TABLE attempts ADD COLUMN student_display_name TEXT NULL`);
  await ensureColumn('attempts', 'photo_data', `ALTER TABLE attempts ADD COLUMN photo_data TEXT NULL`);

  await run(`
    CREATE TABLE IF NOT EXISTS guest_attempts (
      id BIGSERIAL PRIMARY KEY,
      quiz_id BIGINT NOT NULL,
      attempt_token TEXT UNIQUE NOT NULL,
      student_display_name TEXT NOT NULL,
      photo_data TEXT NULL,
      score NUMERIC(10,2) NULL,
      total_correct INTEGER NOT NULL DEFAULT 0,
      time_taken INTEGER NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      submitted_at TIMESTAMPTZ NULL,
      status TEXT NOT NULL DEFAULT 'in_progress',
      CONSTRAINT guest_attempts_quiz_fk FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    )`, 'guest_attempts');

  await run(`
    CREATE TABLE IF NOT EXISTS guest_answers (
      id BIGSERIAL PRIMARY KEY,
      guest_attempt_id BIGINT NOT NULL,
      question_id BIGINT NOT NULL,
      selected_option_id BIGINT NULL,
      answer_text TEXT NULL,
      is_correct INTEGER NOT NULL DEFAULT 0,
      ai_feedback TEXT NULL,
      CONSTRAINT guest_answers_attempt_fk FOREIGN KEY (guest_attempt_id) REFERENCES guest_attempts(id) ON DELETE CASCADE,
      CONSTRAINT guest_answers_question_fk FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )`, 'guest_answers');

  await run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT notifications_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`, 'notifications');

  console.log('\n\u2705 PostgreSQL migration complete!');
}

migrate()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
