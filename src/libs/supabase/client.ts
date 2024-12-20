import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPADB_SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPADB_NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const createSupabaseClient = () => {
     return createClient(supabaseUrl, supabaseAnonKey);
};