'use client';

import { supabase } from 'src/libs/supabase/client';
import { redirect } from 'next/navigation';

const Page = async () => {

     const { data, error } = await supabase.auth.getUser()
     if (error || !data?.user) {
          redirect('/auth/login')
     }

     return (
          <>
               <div>
                    redirecting...
               </div>
          </>
     );
};

export default Page;
