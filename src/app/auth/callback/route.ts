import { NextResponse } from 'next/server';
import { supabase } from 'src/libs/supabase/client';

export async function GET(request: Request) {
     const requestUrl = new URL(request.url);
     console.log('requestUrl', requestUrl);

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
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          console.log('data', data);
          console.log('error', error);
     }

     // Redirect to dashboard with absolute URL
     const dashboardUrl = `${requestUrl.origin}/dashboard`;
     return NextResponse.redirect(dashboardUrl);
}
