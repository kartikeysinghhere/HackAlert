const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, SUPABASE_KEY } = require('./env');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('CRITICAL: Supabase credentials missing');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = supabase;
