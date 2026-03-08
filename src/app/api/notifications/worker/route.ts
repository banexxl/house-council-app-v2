import { NextRequest, NextResponse } from 'next/server'
import { Expo } from 'expo-server-sdk'
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server'

const expo = new Expo()
const MAX_RETRIES = 5

export async function POST(req: NextRequest) {
     const authHeader = req.headers.get("x-cron-secret")

     if (authHeader !== process.env.X_CRON_SECRET) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
     }

     const supabase = await useServerSideSupabaseAnonClient()

     const { data: notifications } = await supabase
          .from('tblNotificationQueue')
          .select('*')
          .eq('status', 'pending')
          .limit(50)
     console.log('Notifications fetched: ', notifications);

     if (!notifications?.length) {
          return NextResponse.json({ processed: 0 })
     }

     const ids = notifications.map(n => n.id)

     await supabase
          .from('tblNotificationQueue')
          .update({ status: 'processing' })
          .in('id', ids)

     const userIds = [...new Set(notifications.map(n => n.user_id))]

     const { data: tokens } = await supabase
          .from('tblUserPushTokens')
          .select('user_id, push_token')
          .in('user_id', userIds)

     const tokensByUser = new Map<string, string[]>()

     tokens?.forEach(t => {
          if (!tokensByUser.has(t.user_id)) {
               tokensByUser.set(t.user_id, [])
          }
          tokensByUser.get(t.user_id)!.push(t.push_token)
     })

     const messages: any[] = []
     const notificationMap: Record<string, string> = {}

     for (const notification of notifications) {

          const userTokens = tokensByUser.get(notification.user_id) ?? []

          if (!userTokens.length) {
               await supabase
                    .from('tblNotificationQueue')
                    .update({ status: 'failed' })
                    .eq('id', notification.id)

               continue
          }

          for (const token of userTokens) {

               if (!Expo.isExpoPushToken(token)) continue

               messages.push({
                    to: token,
                    sound: 'default',
                    title: notification.title,
                    body: notification.body,
                    data: notification.data
               })

               notificationMap[token] = notification.id
          }
     }

     const chunks = expo.chunkPushNotifications(messages)

     for (const chunk of chunks) {

          const tickets = await expo.sendPushNotificationsAsync(chunk)

          for (let i = 0; i < tickets.length; i++) {

               const ticket = tickets[i]
               const token = chunk[i].to as string
               const notificationId = notificationMap[token]

               if (ticket.status === 'ok') {

                    await supabase
                         .from('tblNotificationQueue')
                         .update({
                              status: 'sent',
                              sent_at: new Date()
                         })
                         .eq('id', notificationId)

               } else {

                    const { data } = await supabase
                         .from('tblNotificationQueue')
                         .select('attempts')
                         .eq('id', notificationId)
                         .single()

                    const attempts = (data?.attempts ?? 0) + 1

                    await supabase
                         .from('tblNotificationQueue')
                         .update({
                              status: attempts >= MAX_RETRIES ? 'failed' : 'pending',
                              attempts
                         })
                         .eq('id', notificationId)
               }
          }
     }

     return NextResponse.json({
          processed: notifications.length
     })
}