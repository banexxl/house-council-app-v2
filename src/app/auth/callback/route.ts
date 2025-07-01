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

     if (error) {
          // Redirect to error page with absolute URL
          const errorPageUrl = `${requestUrl.origin}/auth/error?error=${error}&error_code=${errorCode})}`;
          return NextResponse.redirect(errorPageUrl)
     }

     if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
               return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=${error.message}`);
          }
     }

     // Retrieve the session after OAuth to get the user details
     const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
     console.log('sessionData', sessionData);

     if (sessionError) {
          console.error('Error retrieving session:', sessionError);
          return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=${sessionError.message}`);
     }
     if (!sessionData.session) {
          console.error('No session available after sign in.');
          return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=No session found.`);
     }

     // Extract the user's email from the session
     const userEmail = sessionData.session.user.email;
     // Check if the user's email exists in tblClients.
     const { data, error: clientError } = await supabase
          .from('tblClients')
          .select('*')
          .eq('email', userEmail)
          .single();

     // Check if client has an active subscription
     const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('tblClient_Subscriptions')
          .select('*')
          .eq('client_id', data.id)
          .single();

     if (subscriptionError || !subscriptionData) {
          supabase.auth.signOut();
          // Remove cookies
          cookieStore.getAll().forEach(cookie => cookieStore.delete(cookie.name));
          return NextResponse.redirect(`${requestUrl.origin}/auth/error?error_code=no_subscription`);
     }

     // Continue with login


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
          // If the email is not found in tblClients, delete the user from Supabase auth users table sand redirect to error page
          const { data, error } = await supabase.auth.admin.deleteUser(sessionData.session.user.id);

          // Remove cookies
          cookieStore.getAll().forEach(cookie => cookieStore.delete(cookie.name));

          return NextResponse.redirect(`${requestUrl.origin}/auth/error?error_code=email_not_registered`);
     }

     if (data.length > 1) {
          supabase.auth.signOut();
          const { data, error } = await supabase.auth.admin.deleteUser(sessionData.session.user.id);

          // Remove cookies
          cookieStore.getAll().forEach(cookie => cookieStore.delete(cookie.name));

          return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=Duplicate email found. Please contact support.`);
     }

     // Redirect to dashboard with absolute URL
     const dashboardUrl = `${requestUrl.origin}/dashboard`;
     return NextResponse.redirect(dashboardUrl);
}
