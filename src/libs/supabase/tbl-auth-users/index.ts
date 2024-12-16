import { supabase } from "../client";

export const checkUserExists = async (email: string) => {
     const { data, error } = await supabase
          .from('auth.users')
          .select('id')
          .eq('email', email)
          .single(); // Use single() to get a single record

     if (error) {
          console.error('Error checking user existence:', error.message);
          return false; // Return false if there's an error
     }

     return data !== null; // Return true if user exists, false otherwise
};