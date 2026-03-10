import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
     try {
          const { token } = await req.json();

          if (!token) {
               return NextResponse.json(
                    { error: "Push token missing" },
                    { status: 400 }
               );
          }

          const supabase = createClient(
               process.env.NEXT_PUBLIC_SUPABASE_URL!,
               process.env.SUPABASE_SERVICE_ROLE_KEY!
          );

          const { data: { user } } = await supabase.auth.getUser();


          const { error } = await supabase
               .from("tblUserPushTokens")
               .delete()
               .eq("user_id", user?.id)
               .eq("push_token", token)

          if (error) {
               console.error("Remove push token error:", error);
               return NextResponse.json(
                    { error: "Failed to remove token", data: error.message },
                    { status: 500 }
               );
          }

          return NextResponse.json({
               success: true,
          });
     } catch (err) {
          console.error(err);

          return NextResponse.json(
               { error: "Unexpected error" },
               { status: 500 }
          );
     }
}