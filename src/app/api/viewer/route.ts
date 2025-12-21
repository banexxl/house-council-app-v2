import { NextResponse } from 'next/server'
import { getViewer } from 'src/libs/supabase/server-auth'

export async function GET() {
     try {
          const viewer = await getViewer()
          const authed = Boolean(viewer?.userData)

          return NextResponse.json(
               // keep the same payload shape (viewer or null-ish)
               viewer ?? { userData: null },
               {
                    status: authed ? 200 : 401,
                    headers: {
                         // IMPORTANT: avoid any caching of auth state
                         'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
                         Pragma: 'no-cache',
                         Expires: '0',
                    },
               }
          )
     } catch (error) {
          console.error('[api/viewer] Failed to load viewer', error)

          return NextResponse.json(
               { error: 'Failed to load viewer' },
               {
                    status: 500,
                    headers: {
                         'Cache-Control': 'no-store',
                    },
               }
          )
     }
}
