import { supabase } from "../client";

export const checkUserExists = async (email: string) => {

     const { data, error } = await supabase
          .from("tblClients")
          .select("email")
          .eq("email", email)

     if (error) {
          console.error('Error checking user existence:', error.message);
          return false; // Return false if there's an error
     }

     if (data.length === 1 && data[0].email === email) {
          return true; // Return true if the user exists
     }
};