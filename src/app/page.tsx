import { redirect } from "next/navigation";
import { getViewer } from "src/libs/supabase/server-auth";
import { logout } from "./auth/actions";

export default async function Page() {

     const { client, tenant, admin, clientMember } = await getViewer();
     if (!client && !tenant && !admin && !clientMember) {
          redirect('/auth/login');
     }

     if (tenant) {
          redirect('/dashboard/social/profile');
     }

     if (client || clientMember) {
          redirect('/dashboard');
     }

}
