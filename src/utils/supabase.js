import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Make sure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase key exists:', !!supabaseAnonKey);

export default supabase;