import { useEffect, useState } from 'react';
import { supabase } from 'src/libs/supabase/sb-client';

export const useAuth = async () => {

     const [user, setUser] = useState<any>(null);
     const [loading, setLoading] = useState(true);

     useEffect(() => {
          const fetchSession = async () => {
               const { data: { session }, error } = await supabase.auth.getSession();
               if (error) {
                    console.error('Error fetching session:', error);
               } else {
                    setUser(session?.user ?? null);
               }
               setLoading(false);
          };

          fetchSession();

          const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
               setUser(session?.user);
          });

          return () => {
               subscription.unsubscribe();
          };
     }, []);


     return { user, loading };
};