const { Pool } = require('pg');

console.log('=== DATABASE CONNECTION TESTS ===\n');

const tests = [
  {
    name: 'Pooler (with project ref)',
    url: 'postgresql://postgres.ofmvpsywpducpoghxnsc:Espiritu0521!@aws-1-us-east-1.pooler.supabase.com:6543/postgres',
  },
  {
    name: 'Pooler (plain postgres user)',
    url: 'postgresql://postgres:Espiritu0521!@aws-1-us-east-1.pooler.supabase.com:6543/postgres',
  },
  {
    name: 'Direct (IPv4 preferred)',
    url: 'postgresql://postgres:Espiritu0521!@db.ofmvpsywpducpoghxnsc.supabase.co:5432/postgres',
    opts: { family: 4, connectTimeoutMillis: 5000 }
  },
];

(async () => {
  for (const test of tests) {
    process.stdout.write('Testing ' + test.name + '...');
    try {
      const pool = new Pool({ 
        connectionString: test.url,
        ssl: { rejectUnauthorized: false },
        connectTimeoutMillis: 5000,
        ...(test.opts || {})
      });
      const result = await pool.query('SELECT 1');
      console.log(' ✓ SUCCESS');
      await pool.end();
      process.exit(0);
    } catch (e) {
      console.log(' ✗ ' + (e.code || e.message));
      try { if (pool) await pool.end(); } catch {}
    }
  }
  console.log('\nAll connections failed!');
  process.exit(1);
})().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
