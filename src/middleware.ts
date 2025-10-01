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

// 🔐 Your auth cookie base name (with Supabase split cookie support)
const TOKEN_BASE = 'sb-sorklznvftjmhkaejkej-auth-token'

// Public routes that do NOT require authentication
const PUBLIC_ROUTES = [
     '/auth/login',
     '/auth/error',
     '/auth/callback',
     '/auth/reset-password',
     '/api/check-subscription',
     '/api/location-check',
     // Cron / system endpoints (header-key protected internally)
     '/api/cron/publish-scheduled',
] as const

function getSupabaseToken(req: NextRequest): string | null {
     // 1) try single cookie
     const single = req.cookies.get(TOKEN_BASE)?.value
     if (single) return single

     // 2) try split cookies: TOKEN_BASE.0, TOKEN_BASE.1, ...
     const parts: string[] = []
     for (let i = 0; ; i++) {
          const part = req.cookies.get(`${TOKEN_BASE}.${i}`)?.value
          if (!part) break
          parts.push(part)
     }
     return parts.length ? parts.join('') : null
}

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

function isAuthPage(pathname: string) {
     return PUBLIC_ROUTES.some((r) => pathname.startsWith(r))
}

export async function middleware(req: NextRequest) {
     const { pathname, search } = req.nextUrl;

     const raw = getCookieRaw(req);             // cookie string (may be base64 blob)
     const jwt = extractAccessToken(raw);       // actual JWT
     const authed = await isTokenValid(jwt);    // verify signature + exp

     const isAuthPage = PUBLIC_ROUTES.some(r => pathname.startsWith(r));

     if (isAuthPage) {
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