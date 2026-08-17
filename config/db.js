const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || env.SUPABASE_KEY;

if (!env.SUPABASE_URL || !supabaseKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(env.SUPABASE_URL, supabaseKey);

module.exports = supabase;
