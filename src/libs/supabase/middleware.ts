import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
     const { pathname } = request.nextUrl;

     // Bypass middleware for static/public assets or login
     const PUBLIC_ROUTES = ['/auth/login', '/auth/error', '/auth/callback'];
     const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

     // If the request is for a static/public asset or login, bypass middleware
     // NextResponse.next() returns the original response without any modification
     if (isPublic) {
          return NextResponse.next();
     }

     // Proceed with Supabase auth logic only for protected routes
     const supabase = createServerClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
               cookies: {
                    getAll() {
                         return request.cookies.getAll();
                    },
                    setAll(cookiesToSet) {
                         cookiesToSet.forEach(({ name, value, options }) =>
                              supabaseResponse.cookies.set(name, value, options)
                         );
                    },
               },
          }
     );

     const supabaseResponse = NextResponse.next();

     const {
          data: { user },
     } = await supabase.auth.getUser();

     if (!user || !user.email) {
          return NextResponse.redirect(new URL('/auth/error?error=access_denied', request.url));
     }

     const { data } = await supabase
          .from('tblClients')
          .select('id')
          .eq('email', user.email)
          .single();

     if (!data) {
          return NextResponse.redirect(new URL('/auth/error?error_code=not_found_in_tblclients', request.url));
     }

     return supabaseResponse;
}

