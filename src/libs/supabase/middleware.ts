import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {

     let supabaseResponse = NextResponse.next({
          request,
     });

     const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
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

     const { pathname } = request.nextUrl;

     // Define public routes that don't require authentication
     const publicRoutes = ['/auth/login', '/auth/callback', '/auth/error'];
     const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

     // Always allow access to the error page
     if (pathname.startsWith('/auth/error')) {
          return supabaseResponse;
     }

     if (user) {
          // User is authenticated
          if (pathname === '/auth/login' || pathname === '/') {
               // Redirect to dashboard if trying to access login page or root
               return NextResponse.redirect(new URL('/dashboard', request.url));
          }
     } else {
          // User is not authenticated
          if (!isPublicRoute) {
               // Redirect to login page if trying to access a protected route
               return NextResponse.redirect(new URL('/auth/login', request.url));
          }
     }

     // Return the response for all other cases
     return supabaseResponse;
}

