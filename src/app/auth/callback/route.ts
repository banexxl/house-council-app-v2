import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {

     const cookieStore = await cookies();
     const supabase = createServerClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
               console.log('error', error);

               return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=${error.message}`);
          }
     }

     // Retrieve the session after OAuth to get the user details
     const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
     if (sessionError) {
          console.error('Error retrieving session:', sessionError);
          return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=${sessionError.message}`);
     }
     console.log('sessionData', sessionData);

     if (!sessionData.session) {
          console.error('No session available after sign in.');
          return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=No session found.`);
     }

     // Extract the user's email from the session
     const userEmail = sessionData.session.user.email;
     console.log('Authenticated user email:', userEmail);

     // Check if the user's email exists in tblClients.
     const { data, error: clientError } = await supabase
          .from('tblClients')
          .select('*')
          .eq('email', userEmail)

     if (clientError) {
          console.error('Error checking email in database:', clientError);
          supabase.auth.signOut();
          const { data, error } = await supabase.auth.admin.deleteUser(sessionData.session.user.id);

          // Remove cookies
          cookieStore.getAll().forEach(cookie => cookieStore.delete(cookie.name));

          return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=Error checking email in database.`);
     }

     if (!data || data.length === 0) {
          supabase.auth.signOut();
          const { data, error } = await supabase.auth.admin.deleteUser(sessionData.session.user.id);
          console.log('Email not registered. Consider triggering a sign-up process.');

          // Remove cookies
          cookieStore.getAll().forEach(cookie => cookieStore.delete(cookie.name));

          return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=Email not registered. Please sign up.`);
     }

     if (data.length > 1) {
          supabase.auth.signOut();
          const { data, error } = await supabase.auth.admin.deleteUser(sessionData.session.user.id);
          console.log('data', data);
          console.log('error', error);
          console.log('Duplicate email found in tblClients. Please contact support.');

          // Remove cookies
          cookieStore.getAll().forEach(cookie => cookieStore.delete(cookie.name));

          return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=Duplicate email found in tblClients. Please contact support.`);
     }

     console.log('Email found in tblClients. Sign in successful.');

     // Redirect to dashboard with absolute URL
     const dashboardUrl = `${requestUrl.origin}/dashboard`;
     return NextResponse.redirect(dashboardUrl);
}
