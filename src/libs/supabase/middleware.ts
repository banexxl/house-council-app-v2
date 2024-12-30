import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
     let supabaseResponse = NextResponse.next({
          request,
     });

     const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
               cookies: {
                    getAll() {
                         return request.cookies.getAll();
                    },
                    setAll(cookiesToSet) {
                         cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
                         supabaseResponse = NextResponse.next({
                              request,
                         });
                         cookiesToSet.forEach(({ name, value, options }) =>
                              supabaseResponse.cookies.set(name, value, options)
                         );
                    },
               },
          }
     );

     // Retrieve the authenticated user
     const {
          data: { user },
     } = await supabase.auth.getUser();

     const url = request.nextUrl.clone();

     if (!user) {
          // No user found, redirect to the login page if not already there
          if (
               !request.nextUrl.pathname.startsWith('/auth/login') &&
               !request.nextUrl.pathname.startsWith('/auth')
          ) {
               console.log('No user found, middleware is redirecting to login page');
               url.pathname = '/auth/login';
               return NextResponse.redirect(url);
          }
     } else {
          // User is authenticated, redirect to /dashboard if not already there
          if (request.nextUrl.pathname !== '/dashboard') {
               console.log('Authenticated user found, redirecting to /dashboard');
               url.pathname = '/dashboard';
               return NextResponse.redirect(url);
          }
     }

     // Ensure to return the updated response object
     return supabaseResponse;
}
