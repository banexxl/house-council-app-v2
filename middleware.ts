import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextRequest, NextResponse } from "next/server";

export const middleware = async (req: NextRequest) => {

     const res = NextResponse.next()

     const supabase = createMiddlewareClient({
          req, res
     });

     const { data: { session }, error } = await supabase.auth.getSession()

     if (error) {
          console.error('error:', error);
          return NextResponse.rewrite(new URL('/auth/login', req.url))
     }

     return res
}
