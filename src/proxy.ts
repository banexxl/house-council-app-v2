// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { extractAccessToken, getCookieRaw } from './utils/auth-cookie'

export const config = {
     matcher: [
          '/((?!_next/|favicon.ico|robots.txt|sitemap.xml|assets/).*)',
          '/auth/(.*)',
          '/dashboard/(.*)',
     ],
}

const AUTH_PAGES = [
     '/auth/login',
     '/auth/error',
     '/auth/callback',
     '/auth/reset-password',
     '/auth/access-request',
] as const

const PUBLIC_ENDPOINTS = [
     '/api/viewer',
     '/api/access-request/request',
     '/api/access-request/approve',
     '/api/check-subscription',
     '/api/location-check',
     '/api/publish-scheduled-announcements',
     '/api/ip',
     '/api/storage/sign-file',
     '/api/calendar-event-reminder',
] as const

function getBearerToken(req: NextRequest): string | null {
     const auth = req.headers.get('authorization') || ''
     if (!auth.toLowerCase().startsWith('bearer ')) return null
     return auth.slice(7)
}

async function isTokenValid(jwt: string | null): Promise<boolean> {
     try {
          if (!jwt) return false
          const secret = process.env.SUPABASE_JWT_SECRET
          if (!secret) return false
          await jwtVerify(jwt, new TextEncoder().encode(secret), { algorithms: ['HS256'] })
          return true
     } catch {
          return false
     }
}

export async function proxy(req: NextRequest) {
     const { pathname, search } = req.nextUrl
     const isApiRoute = pathname.startsWith('/api/')

     const raw = getCookieRaw(req)
     const jwt = extractAccessToken(raw) ?? getBearerToken(req)
     const authed = await isTokenValid(jwt)
     const isAuthPage = AUTH_PAGES.some(r => pathname.startsWith(r))
     const isPublicEndpoint = PUBLIC_ENDPOINTS.some(r => pathname.startsWith(r))

     // Auth pages: redirect logged-in users away from login
     if (isAuthPage) {
          if (authed) return NextResponse.redirect(new URL('/dashboard', req.url))
          return NextResponse.next()
     }

     // Public endpoints: always allow
     if (isPublicEndpoint) {
          return NextResponse.next()
     }

     // Cron exception (keep yours)
     if (pathname.startsWith('/api/cron/publish-scheduled')
          || pathname.startsWith('/api/polar/sync-price')
          || pathname.startsWith('/api/poll')
     ) {
          const provided = req.headers.get('x-cron-secret')
          if (provided && provided === process.env.X_CRON_SECRET) {
               return NextResponse.next()
          }
     }

     // Protected: if not authed
     if (!authed) {
          // APIs must return 401, NOT redirect
          if (isApiRoute) {
               return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
                    status: 401,
                    headers: {
                         'Content-Type': 'application/json',
                         'Cache-Control': 'no-store',
                    },
               })
          }

          const login = new URL('/auth/login', req.url)
          login.searchParams.set('redirect', `${pathname}${search}`)
          return NextResponse.redirect(login)
     }

     // Optional: prevent caching of protected pages
     const res = NextResponse.next()
     if (!isApiRoute) {
          res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
          res.headers.set('Pragma', 'no-cache')
          res.headers.set('Expires', '0')
     }
     return res
}

// ✅ IMPORTANT: make Next use this function
export { proxy as middleware }
