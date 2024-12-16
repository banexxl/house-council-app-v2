import { NextResponse } from 'next/server';
import { createClient } from 'src/libs/supabase/server';

export async function GET(request: Request) {
     const requestUrl = new URL(request.url);
     // Extract the "code" and "error" parameters
     const code = requestUrl.searchParams.get('code');
     const error = requestUrl.searchParams.get('error');
     const errorCode = requestUrl.searchParams.get('error_code');
     const errorDescription = requestUrl.searchParams.get('error_description');

     if (error) {
          // Redirect to error page with absolute URL
          const errorPageUrl = `${requestUrl.origin}/auth/error?error=${error}&error_code=${errorCode}&error_description=${encodeURIComponent(errorDescription || '')}`;
          return NextResponse.redirect(errorPageUrl)
     }

     if (code) {
          const supabase = await createClient();
          await supabase.auth.exchangeCodeForSession(code);
     }

     // Redirect to dashboard with absolute URL
     const dashboardUrl = `${requestUrl.origin}/dashboard`;
     return NextResponse.redirect(dashboardUrl);
}
