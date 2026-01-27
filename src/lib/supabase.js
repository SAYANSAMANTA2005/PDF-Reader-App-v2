import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('CRITICAL: Supabase credentials missing in .env file!');
} else {
    console.log('Supabase Initializing with URL:', supabaseUrl);
    console.log('Supabase Key format:', supabaseAnonKey.substring(0, 5) + '...');
}

export const supabase = createClient(
    supabaseUrl || 'https://invalid-url.supabase.co',
    supabaseAnonKey || 'no-key-provided'
);
