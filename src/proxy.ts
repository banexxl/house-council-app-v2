// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { extractAccessToken, getCookieRaw } from './utils/auth-cookie'

// ✅ Middleware always runs on Edge
export const config = {
     // Exclude common static assets and public files from the middleware
     /*
          * Match all request paths except for the ones starting with:
          * - _next/static (static files)
          * - _next/image (image optimization files)
          * - favicon.ico (favicon file)
          * Feel free to modify this pattern to include more paths.
     */
     matcher: [
          '/((?!_next/|favicon.ico|robots.txt|sitemap.xml|assets/).*)',
          '/auth/(.*)',
          '/dashboard/(.*)',
     ],
}

// Public routes that do NOT require authentication
const PUBLIC_ROUTES = [
     '/auth/login',
     '/auth/error',
     '/auth/callback',
     '/auth/reset-password',
     '/auth/access-request',
     '/dashboard/access-request',
     '/api/access-request/request',
     '/api/access-request/approve',
     '/api/check-subscription',
     '/api/location-check',
     '/api/publish-scheduled-announcements',
     '/api/ip',
     '/api/storage/sign-file'
] as const

async function isTokenValid(jwt: string | null): Promise<boolean> {
     try {
          if (!jwt) return false;
          const secret = process.env.SUPABASE_JWT_SECRET; // must be set in Edge env
          if (!secret) return false;
          await jwtVerify(jwt, new TextEncoder().encode(secret), { algorithms: ['HS256'] });
          return true;
     } catch {
          return false;
     }
}

export async function proxy(req: NextRequest) {
     const { pathname, search } = req.nextUrl;
     const isApiRoute = pathname.startsWith('/api/');

     const raw = getCookieRaw(req);             // cookie string (may be base64 blob)
     const jwt = extractAccessToken(raw);       // actual JWT
     const authed = await isTokenValid(jwt);    // verify signature + exp
     console.log(`Middleware: ${pathname} (authed: ${authed})`);
     const isAuthPage = PUBLIC_ROUTES.some(r => pathname.startsWith(r));

     if (isAuthPage) {
          if (isApiRoute) return NextResponse.next();
          if (authed) return NextResponse.redirect(new URL('/dashboard', req.url));
          return NextResponse.next();
     }

     // Allow cron route with secret header even if not authed
     if (pathname.startsWith('/api/cron/publish-scheduled')) {
          const provided = req.headers.get('x-cron-secret');
          if (provided && provided === process.env.CRON_PUBLISH_SECRET) {
               return NextResponse.next();
          }
          // Fall through to normal auth handling if header missing/invalid
     }

     if (!authed) {
          const login = new URL('/auth/login', req.url);
          login.searchParams.set('redirect', `${pathname}${search}`);
          return NextResponse.redirect(login);
     }

     return NextResponse.next();
}
