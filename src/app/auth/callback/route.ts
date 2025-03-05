import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
     console.log('usao u callback sa requestom', request);

     const cookieStore = await cookies();
     const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
               cookies: {
                    getAll: () => cookieStore.getAll(),
                    setAll: (cookiesToSet) => {
                         cookiesToSet.forEach(({ name, value, options }) => {
                              try {
                                   cookieStore.set(name, value, options);
                              } catch {
                                   // Handle cases where setting cookies in server actions isn't supported
                              }
                         });
                    },
               },
          }
     );

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
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
               return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=${error.message}`);
          }
     }

     // Redirect to dashboard with absolute URL
     const dashboardUrl = `${requestUrl.origin}/dashboard`;
     return NextResponse.redirect(dashboardUrl);
}
