import { NextRequest, NextResponse } from "next/server";
import {
     useServerSideSupabaseAnonClient,
     useServerSideSupabaseServiceRoleAdminClient,
} from "src/libs/supabase/sb-server";

export async function POST(req: NextRequest) {
     try {
          const body = await req.json().catch(() => ({} as any));
          const token = typeof body?.token === "string" ? body.token.trim() : "";

          if (!token) {
               return NextResponse.json(
                    { error: "Push token missing" },
                    { status: 400 }
               );
          }

          // Authenticate the caller (cookie session or Authorization: Bearer <jwt>)
          const authSb = await useServerSideSupabaseAnonClient();
          const authHeader = req.headers.get("authorization");
          const jwt = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;
          const {
               data: { user },
               error: userErr,
          } = jwt ? await authSb.auth.getUser(jwt) : await authSb.auth.getUser();

          if (userErr || !user) {
               return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
          }

          // Use service role for the delete after verifying the user's identity
          const supabase = await useServerSideSupabaseServiceRoleAdminClient();


          const { error } = await supabase
               .from("tblUserPushTokens")
               .delete()
               .eq("user_id", user.id)
               .eq("push_token", token);

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