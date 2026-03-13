const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './database.sqlite';

const db = new sqlite3.Database(path.resolve(DB_PATH), (err) => {
  if (err) { console.error('Error opening database:', err.message); process.exit(1); }
  console.log('Connected to SQLite database.');
});

function run(sql, label) {
  return new Promise((res, rej) =>
    db.run(sql, (err) => {
      if (err) { console.error(`Error: ${label} —`, err.message); rej(err); }
      else { console.log(`✓ ${label}`); res(); }
    })
  );
}

async function migrate() {
  await run(`PRAGMA foreign_keys = ON`, 'foreign keys');

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      email_verified_at TEXT DEFAULT NULL,
      remember_token TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`, 'users');

  // Add role column to existing users table if upgrading
  await run(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'student'`, 'users.role column').catch(() => {});

  await run(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      email TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )`, 'password_reset_tokens');

  await run(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT NULL,
      source_type TEXT NOT NULL DEFAULT 'ai',
      file_path TEXT DEFAULT NULL,
      time_limit INTEGER DEFAULT NULL,
      total_questions INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 0,
      sections_config TEXT DEFAULT NULL,
      ai_response TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`, 'quizzes');

  // Add new columns to existing quizzes table if upgrading
  for (const col of [
    `ALTER TABLE quizzes ADD COLUMN description TEXT DEFAULT NULL`,
    `ALTER TABLE quizzes ADD COLUMN source_type TEXT NOT NULL DEFAULT 'ai'`,
    `ALTER TABLE quizzes ADD COLUMN time_limit INTEGER DEFAULT NULL`,
    `ALTER TABLE quizzes ADD COLUMN is_published INTEGER NOT NULL DEFAULT 0`,
  ]) { await run(col, `quizzes upgrade`).catch(() => {}); }

  await run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL DEFAULT 'multiple_choice',
      correct_answer TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    )`, 'questions');

  await run(`
    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      option_text TEXT NOT NULL,
      option_label TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )`, 'options');

  await run(`
    CREATE TABLE IF NOT EXISTS quiz_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      assigned_by INTEGER NOT NULL,
      due_date TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      assigned_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(quiz_id, student_id)
    )`, 'quiz_assignments');

  await run(`
    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      quiz_id INTEGER NOT NULL,
      score REAL DEFAULT NULL,
      total_correct INTEGER NOT NULL DEFAULT 0,
      time_taken INTEGER DEFAULT NULL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      submitted_at TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'in_progress',
      FOREIGN KEY (assignment_id) REFERENCES quiz_assignments(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    )`, 'attempts');

  await run(`
    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      selected_option_id INTEGER DEFAULT NULL,
      answer_text TEXT DEFAULT NULL,
      is_correct INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )`, 'answers');

  await run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`, 'notifications');

  console.log('\n✅ Migration complete!');
  db.close();
}

migrate().catch((e) => { console.error(e); db.close(); process.exit(1); });
