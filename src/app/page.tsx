import { createClient } from 'src/libs/supabase/server';
import { redirect } from 'next/navigation';

const Page = async () => {

     const supabase = await createClient();
     const { data, error } = await supabase.auth.getUser()
     if (error || !data?.user) {
          redirect('/auth/login')
     } else {
          redirect('/dashboard')
     }
};

export default Page;
