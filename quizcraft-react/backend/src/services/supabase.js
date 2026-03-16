const { createClient } = require('@supabase/supabase-js');

let client;

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const enabled = process.env.USE_SUPABASE === 'true';
  if (!enabled || !url || !key) return null;

  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

module.exports = { getSupabaseClient };
