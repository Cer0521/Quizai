require('dotenv').config();
const { Pool } = require('pg');

console.log('=== QUIZCRAFT AUTH DIAGNOSIS ===\n');

// 1. Check environment variables
console.log('📋 Environment Variables:');
console.log('  PORT:', process.env.PORT || 'NOT SET');
console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '✓ SET' : '❌ NOT SET');
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✓ SET' : '❌ NOT SET');
console.log('  DIRECT_URL:', process.env.DIRECT_URL ? '✓ SET' : '❌ NOT SET');
console.log('  SUPABASE_DB_URL:', process.env.SUPABASE_DB_URL ? '✓ SET' : '❌ NOT SET');
console.log('  DB_SSL:', process.env.DB_SSL || 'true (default)');
console.log();

// 2. Validate URLs
const validateURL = (url, name) => {
  if (!url) {
    console.log(`  ❌ ${name}: NOT SET`);
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    console.log(`  ✓ ${name}: Valid URL`);
    console.log(`    - Host: ${urlObj.hostname}`);
    console.log(`    - Port: ${urlObj.port}`);
    console.log(`    - Has password: ${urlObj.password ? '✓ YES' : '❌ NO'}`);
    
    // Check for unencoded special chars
    if (urlObj.password && /[!@#$%^&*]/g.test(urlObj.password)) {
      console.log(`    ⚠️  WARNING: Password contains special chars. Should be URL-encoded!`);
      console.log(`    Example: ! should be %21, @ should be %40`);
    }
    return true;
  } catch (err) {
    console.log(`  ❌ ${name}: Invalid URL - ${err.message}`);
    return false;
  }
};

console.log('🔗 Connection URLs:');
validateURL(process.env.DATABASE_URL, 'DATABASE_URL');
console.log();
validateURL(process.env.DIRECT_URL, 'DIRECT_URL');
console.log();

// 3. Test database connection
(async () => {
  const DATABASE_URL = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  
  if (!DATABASE_URL) {
    console.log('❌ No DATABASE_URL configured. Cannot test connection.');
    process.exit(1);
  }

  console.log('🧪 Testing Database Connection:\n');
  process.stdout.write('  Connecting...');
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    connectTimeoutMillis: 8000,
    idleTimeoutMillis: 5000,
  });

  try {
    const result = await pool.query('SELECT 1 as test');
    console.log(' ✓ SUCCESS\n');
    
    // 4. Check users table
    console.log('📊 Checking Schema:\n');
    try {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'users'
        )
      `);
      
      if (tableCheck.rows[0].exists) {
        console.log('  ✓ users table exists');
        
        // Count users
        const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
        console.log(`  - Total users: ${userCount.rows[0].count}`);
        
        // Check schema structure
        const columns = await pool.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name='users' AND table_schema='public'
          ORDER BY ordinal_position
        `);
        
        console.log('\n  Columns:');
        columns.rows.forEach(col => {
          console.log(`    - ${col.column_name} (${col.data_type})`);
        });
      } else {
        console.log('  ❌ users table NOT FOUND - RUN MIGRATION!');
      }
    } catch (err) {
      console.log('  ⚠️  Could not check schema:', err.message);
    }
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.log(` ❌ FAILED\n`);
    console.log('Error Details:');
    console.log(`  Code: ${err.code}`);
    console.log(`  Message: ${err.message}`);
    
    if (err.code === 'ENOTFOUND') {
      console.log('\n  💡 Fix: Database host not found. Check DATABASE_URL hostname.');
    } else if (err.code === 'ECONNREFUSED') {
      console.log('\n  💡 Fix: Connection refused. Check if Supabase is running and accessible.');
    } else if (err.code === 'ETIMEDOUT') {
      console.log('\n  💡 Fix: Connection timeout. Check network connectivity and firewall rules.');
    } else if (err.message.includes('password')) {
      console.log('\n  💡 Fix: Authentication failed. Check credentials in DATABASE_URL.');
    }
    
    await pool.end();
    process.exit(1);
  }
})().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
