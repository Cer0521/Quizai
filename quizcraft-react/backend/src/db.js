const { Pool } = require('pg');
const dns = require('dns');

// Force IPv4 resolution globally - prevents IPv6 timeout hangs
dns.setDefaultResultOrder('ipv4first');

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

const resolver = new dns.Resolver();
resolver.setServers((process.env.DB_DNS_SERVERS || '8.8.8.8,1.1.1.1').split(',').map(s => s.trim()).filter(Boolean));

function dnsLookup(hostname, options, callback) {
  const family = typeof options === 'object' && options?.family ? options.family : 0;

  const done = (err, address, fam) => {
    if (err) return callback(err);
    callback(null, address, fam);
  };

  const tryIPv4 = () => {
    resolver.resolve4(hostname, (err4, addrs4) => {
      if (err4 || !addrs4?.length) return done(err4 || new Error(`DNS resolve failed for ${hostname}`));
      done(null, addrs4[0], 4);
    });
  };

  // For Supabase, always prefer IPv4 to avoid IPv6 timeouts
  if (hostname.includes('supabase.com')) {
    return tryIPv4();
  }

  if (family === 4) return tryIPv4();
  
  // For other hosts, try IPv6 first with SHORT timeout, then fall back to IPv4
  let ipv6Resolved = false;
  const ipv6Timeout = setTimeout(() => {
    if (!ipv6Resolved) {
      ipv6Resolved = true;
      tryIPv4();
    }
  }, 1000);  // 1 second timeout for IPv6
  
  resolver.resolve6(hostname, (err6, addrs6) => {
    if (ipv6Resolved) return;
    clearTimeout(ipv6Timeout);
    ipv6Resolved = true;
    if (!err6 && addrs6?.length) return done(null, addrs6[0], 6);
    tryIPv4();
  });
}

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
    // Parse SSL settings - allows disabling for local dev
    let sslConfig = false;
    if (process.env.DB_SSL !== 'false') {
      sslConfig = {
        rejectUnauthorized: false,
        checkServerIdentity: () => null,  // Disable all certificate validation
        servername: new URL(DATABASE_URL).hostname, // Enable SNI
      };
    }

    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: sslConfig,
      lookup: dnsLookup,
      family: 4,  // Force IPv4 only
      idleTimeoutMillis: 5000,
      max: 10,  // Connection pool size
      min: 2,   // Minimum idle connections
      connectTimeoutMillis: 10000,
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
