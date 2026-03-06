import { NextRequest, NextResponse } from 'next/server'
import { sendPushNotification } from 'src/libs/expo/expo-push'
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server'

export async function POST(req: NextRequest) {
     try {
          const { userId, title, body, data } = await req.json()

          if (!userId) {
               return NextResponse.json(
                    { error: 'Missing userId' },
                    { status: 400 }
               )
          }

          const supabase = await useServerSideSupabaseAnonClient()

          const { data: tokens, error } = await supabase
               .from('tblUserPushTokens')
               .select('push_token')
               .eq('user_id', userId)

          if (error) {
               return NextResponse.json(
                    { error: 'Failed to fetch tokens' },
                    { status: 500 }
               )
          }

          const pushTokens = tokens?.map((t) => t.push_token) ?? []

          if (pushTokens.length === 0) {
               return NextResponse.json({
                    success: true,
                    message: 'No tokens for user'
               })
          }

          const tickets = await sendPushNotification(
               pushTokens,
               title,
               body,
               data
          )

          return NextResponse.json({
               success: true,
               tickets
          })
     } catch (err) {
          console.error(err)

          return NextResponse.json(
               { error: 'Unexpected error' },
               { status: 500 }
          )
     }
}