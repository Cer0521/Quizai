require('dotenv').config();
const { Pool } = require('pg');
const dns = require('dns');

console.log('=== TESTING CORRECTED CONNECTION ===\n');

const DATABASE_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.log('❌ No DATABASE_URL set!');
  process.exit(1);
}

// Set IPv4 ONLY globally to prevent IPv6 resolution
dns.setDefaultResultOrder('ipv4first');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectTimeoutMillis: 10000,
  idleTimeoutMillis: 5000,
  family: 4,  // Force IPv4 only
});

(async () => {
  try {
    console.log('Connecting to Supabase with IPv4-only...');
    const result = await pool.query('SELECT 1 as test');
    console.log('✓ SUCCESS! Connection works.\n');
    
    // Check users table
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      )
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✓ Schema exists');
      const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
      console.log(`✓ Total users in database: ${userCount.rows[0].count}`);
    } else {
      console.log('⚠️ Schema not initialized. Will auto-create on app start.');
    }
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.log('❌ Connection failed:', err.message);
    console.log('\nPossible issues:');
    console.log('1. Supabase credentials are wrong');
    console.log('2. Network/firewall is blocking connection');
    console.log('3. Password special characters not URL-encoded (! → %21)');
    await pool.end();
    process.exit(1);
  }
})();
