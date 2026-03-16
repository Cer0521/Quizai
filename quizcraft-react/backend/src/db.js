const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

let pool;

function toPgSql(sql) {
  let out = sql;
  let idx = 0;

  // Keep legacy SQL calls working while moving to PostgreSQL.
  out = out.replace(/datetime\(("|')now\1\)/gi, 'NOW()');
  out = out.replace(/\bMAX\(0\s*,/g, 'GREATEST(0,');
  out = out.replace(/\?/g, () => `$${++idx}`);

  return out;
}

function getDb() {
  if (!DATABASE_URL) {
    throw new Error('Missing DATABASE_URL (or SUPABASE_DB_URL) environment variable.');
  }

  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function query(sql, params = []) {
  const text = toPgSql(sql);
  return getDb().query(text, params);
}

async function dbGet(sql, params = []) {
  const result = await query(sql, params);
  return result.rows[0];
}

async function dbAll(sql, params = []) {
  const result = await query(sql, params);
  return result.rows;
}

async function dbRun(sql, params = []) {
  const insertMatch = sql.match(/^\s*insert\s+into\s+([a-z_]+)/i);
  const tablesWithId = new Set([
    'users',
    'quizzes',
    'questions',
    'options',
    'quiz_assignments',
    'attempts',
    'answers',
    'guest_attempts',
    'guest_answers',
    'notifications',
  ]);

  let runSql = sql;
  if (insertMatch && tablesWithId.has(insertMatch[1].toLowerCase()) && !/\breturning\b/i.test(sql)) {
    runSql = `${sql} RETURNING id`;
  }

  const result = await query(runSql, params);
  return {
    lastID: result.rows?.[0]?.id ?? null,
    changes: result.rowCount ?? 0,
  };
}

module.exports = { getDb, dbGet, dbAll, dbRun };
