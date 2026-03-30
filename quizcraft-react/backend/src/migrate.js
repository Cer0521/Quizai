require('dotenv').config();
const { Pool } = require('pg');
const dns = require('dns');

// Try direct connection first (better for migrations), fall back to pooler
const DATABASE_URL = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!DATABASE_URL) {
  console.error('Missing DIRECT_URL or DATABASE_URL (or SUPABASE_DB_URL) in environment.');
  process.exit(1);
}

if (/[<>\[\]]/.test(DATABASE_URL) || /YOUR_DB_PASSWORD|YOUR-PASSWORD|project-ref/i.test(DATABASE_URL)) {
  console.error('Invalid DATABASE_URL: placeholder values detected. Set a real Supabase Postgres URL first.');
  process.exit(1);
}

const resolver = new dns.Resolver();
resolver.setServers((process.env.DB_DNS_SERVERS || '8.8.8.8,1.1.1.1').split(',').map(s => s.trim()).filter(Boolean));

function dnsLookup(hostname, options, callback) {
  const family = typeof options === 'object' && options?.family ? options.family : 0;
  console.log(`[DNS] Resolving ${hostname} (family: ${family})`);

  const done = (err, address, fam) => {
    if (err) {
      console.log(`[DNS] ${hostname} → ERROR: ${err.message}`);
      return callback(err);
    }
    console.log(`[DNS] ${hostname} → ${address} (IPv${fam})`);
    callback(null, address, fam);
  };

  const tryIPv4 = () => {
    console.log(`[DNS] Trying IPv4 for ${hostname}...`);
    resolver.resolve4(hostname, (err4, addrs4) => {
      if (err4 || !addrs4?.length) {
        console.log(`[DNS] IPv4 failed for ${hostname}: ${err4?.message || 'no addresses'}`);
        return done(err4 || new Error(`DNS resolve failed for ${hostname}`));
      }
      console.log(`[DNS] IPv4 resolved ${hostname} to ${addrs4[0]}`);
      done(null, addrs4[0], 4);
    });
  };

  // For Supabase, always prefer IPv4 to avoid IPv6 timeouts
  if (hostname.includes('supabase.com')) {
    console.log(`[DNS] Supabase host detected, forcing IPv4`);
    return tryIPv4();
  }

  if (family === 4) return tryIPv4();
  
  // For other hosts, try IPv6 first with SHORT timeout, then fall back to IPv4
  console.log(`[DNS] Trying IPv6 first for ${hostname} (timeout 1s)...`);
  let ipv6Resolved = false;
  const ipv6Timeout = setTimeout(() => {
    if (!ipv6Resolved) {
      console.log(`[DNS] IPv6 timeout for ${hostname}, falling back to IPv4`);
      ipv6Resolved = true;
      tryIPv4();
    }
  }, 1000);  // 1 second timeout for IPv6
  
  resolver.resolve6(hostname, (err6, addrs6) => {
    if (ipv6Resolved) return;
    clearTimeout(ipv6Timeout);
    ipv6Resolved = true;
    if (!err6 && addrs6?.length) {
      console.log(`[DNS] IPv6 resolved ${hostname} to ${addrs6[0]}`);
      return done(null, addrs6[0], 6);
    }
    console.log(`[DNS] IPv6 failed for ${hostname}, trying IPv4`);
    tryIPv4();
  });
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  lookup: dnsLookup,
  family: 4,  // Force IPv4 only
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

  await ensureColumn('quizzes', 'user_id', `ALTER TABLE quizzes ADD COLUMN user_id BIGINT`);
  await ensureColumn('quizzes', 'title', `ALTER TABLE quizzes ADD COLUMN title TEXT`);
  await ensureColumn('quizzes', 'description', `ALTER TABLE quizzes ADD COLUMN description TEXT NULL`);
  await ensureColumn('quizzes', 'source_type', `ALTER TABLE quizzes ADD COLUMN source_type TEXT NOT NULL DEFAULT 'ai'`);
  await ensureColumn('quizzes', 'file_path', `ALTER TABLE quizzes ADD COLUMN file_path TEXT NULL`);
  await ensureColumn('quizzes', 'time_limit', `ALTER TABLE quizzes ADD COLUMN time_limit INTEGER NULL`);
  await ensureColumn('quizzes', 'total_questions', `ALTER TABLE quizzes ADD COLUMN total_questions INTEGER NOT NULL DEFAULT 0`);
  await ensureColumn('quizzes', 'is_published', `ALTER TABLE quizzes ADD COLUMN is_published INTEGER NOT NULL DEFAULT 0`);
  await ensureColumn('quizzes', 'share_token', `ALTER TABLE quizzes ADD COLUMN share_token TEXT NULL`);
  await ensureColumn('quizzes', 'show_score', `ALTER TABLE quizzes ADD COLUMN show_score INTEGER NOT NULL DEFAULT 1`);
  await ensureColumn('quizzes', 'sections_config', `ALTER TABLE quizzes ADD COLUMN sections_config TEXT NULL`);
  await ensureColumn('quizzes', 'ai_response', `ALTER TABLE quizzes ADD COLUMN ai_response TEXT NULL`);
  await ensureColumn('quizzes', 'created_at', `ALTER TABLE quizzes ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW()`);
  await ensureColumn('quizzes', 'updated_at', `ALTER TABLE quizzes ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW()`);

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
