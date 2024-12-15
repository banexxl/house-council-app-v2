import { NextResponse } from 'next/server'
import { createClient } from 'src/libs/supabase/server'

export async function GET(request: Request) {
     const requestUrl = new URL(request.url)
     console.log('requestUrl:', requestUrl);

     const code = requestUrl.searchParams.get('code')
     console.log('code:', code);

     if (code) {
          const supabase = await createClient()
          await supabase.auth.exchangeCodeForSession(code)
     }

     // URL to redirect to after sign in process completes
     return NextResponse.redirect(requestUrl.origin)
}

