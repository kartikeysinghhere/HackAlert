const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

module.exports = supabase;
