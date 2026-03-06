import { NextRequest, NextResponse } from 'next/server'
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server'

export async function POST(req: NextRequest) {
     try {
          const { userId, token } = await req.json()

          if (!userId || !token) {
               return NextResponse.json(
                    { error: 'Missing userId or token' },
                    { status: 400 }
               )
          }

          const supabase = await useServerSideSupabaseAnonClient()

          const { error } = await supabase
               .from('tblUserPushTokens')
               .upsert({
                    user_id: userId,
                    push_token: token
               })

          if (error) {
               console.error(error)
               return NextResponse.json(
                    { error: 'Failed to save token' },
                    { status: 500 }
               )
          }

          return NextResponse.json({ success: true })
     } catch (error) {
          console.error(error)

          return NextResponse.json(
               { error: 'Unexpected error' },
               { status: 500 }
          )
     }
}