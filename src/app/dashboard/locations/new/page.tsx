'use server';

import { checkIfUserExistsAndReturnDataAndSessionObject } from "src/libs/supabase/server-auth";
import NewLocation from "./new-location";
import { logout } from "src/app/auth/actions";
import { redirect } from "next/navigation";

const Page = async () => {

     const userData = await checkIfUserExistsAndReturnDataAndSessionObject();
     if (!userData) {
          logout()
          redirect('/auth/login')
     };

     const mapBoxAccessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY!;


     return (
          <NewLocation mapBoxAccessToken={mapBoxAccessToken} userData={userData} />
     );
};

export default Page;
