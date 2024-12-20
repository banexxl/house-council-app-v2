import { createClient } from "../server";

export const checkUserExists = async (email: string) => {
     const supabase = await createClient();
     const { data, error } = await supabase.auth.admin.listUsers()

     if (error) {
          console.error('Error checking user existence:', error.message);
          return false; // Return false if there's an error
     }

     if (data.users.length === 1 && data.users[0].email === email) {
          return true; // Return true if the user exists
     }
};