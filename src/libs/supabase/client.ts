import { createClient } from '@supabase/supabase-js';

// Ensure these variables exist on the client side
if (!process.env.SUPADB_SUPABASE_URL || !process.env.SUPADB_SUPABASE_SERVICE_ROLE_KEY) {
     throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(
     process.env.SUPADB_SUPABASE_URL!,
     process.env.SUPADB_SUPABASE_SERVICE_ROLE_KEY!
)
