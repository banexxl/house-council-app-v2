import { NextRequest, NextResponse } from 'next/server'
import { Expo } from 'expo-server-sdk'
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server'

const expo = new Expo()
const MAX_RETRIES = 5

export async function POST(req: NextRequest) {
     const authHeader = req.headers.get('x-cron-secret')

     if (authHeader !== process.env.X_CRON_SECRET) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
     }

     const supabase = await useServerSideSupabaseAnonClient()

     // 1. Get pending notifications
     const { data: notifications, error } = await supabase
          .from('tblNotificationQueue')
          .select('*')
          .eq('status', 'pending')
          .limit(50)

     if (error) {
          console.error('Error fetching notifications:', error)
          return NextResponse.json({ error: 'DB error' }, { status: 500 })
     }

     if (!notifications?.length) {
          return NextResponse.json({ processed: 0 })
     }

     // 2. Mark as processing + increment attempts
     await Promise.all(
          notifications.map((n) =>
               supabase
                    .from('tblNotificationQueue')
                    .update({
                         status: 'processing',
                         attempts: (n.attempts ?? 0) + 1,
                    })
                    .eq('id', n.id)
          )
     )

     // 3. Get tokens
     const userIds = [...new Set(notifications.map((n) => n.user_id))]

     const { data: tokens } = await supabase
          .from('tblUserPushTokens')
          .select('user_id, push_token')
          .in('user_id', userIds)

     const tokensByUser = new Map<string, string[]>()

     tokens?.forEach((t) => {
          if (!tokensByUser.has(t.user_id)) {
               tokensByUser.set(t.user_id, [])
          }
          tokensByUser.get(t.user_id)!.push(t.push_token)
     })

     const messages: any[] = []
     const messageMeta: { notificationId: string }[] = []

     // 4. Build messages
     for (const notification of notifications) {
          const userTokens = tokensByUser.get(notification.user_id) ?? []

          const validTokens = userTokens.filter((t) =>
               Expo.isExpoPushToken(t)
          )

          if (!validTokens.length) {
               await supabase
                    .from('tblNotificationQueue')
                    .update({ status: 'failed' })
                    .eq('id', notification.id)

               continue
          }

          for (const token of validTokens) {
               messages.push({
                    to: token,
                    sound: 'default',
                    title: notification.title,
                    body: notification.body,
                    data:
                         typeof notification.data === 'object'
                              ? notification.data
                              : {},
                    channelId: 'default',
               })

               messageMeta.push({
                    notificationId: notification.id,
               })
          }
     }

     if (!messages.length) {
          return NextResponse.json({ processed: 0 })
     }

     const chunks = expo.chunkPushNotifications(messages)

     // Track results per notification
     const notificationResults: Record<string, boolean> = {}

     let globalIndex = 0

     // 5. Send notifications
     for (const chunk of chunks) {
          const tickets = await expo.sendPushNotificationsAsync(chunk)

          console.log('Expo tickets:', tickets)

          for (let i = 0; i < tickets.length; i++) {
               const ticket = tickets[i]
               const notificationId = messageMeta[globalIndex].notificationId

               globalIndex++

               if (!notificationResults[notificationId]) {
                    notificationResults[notificationId] = false
               }

               if (ticket.status === 'ok') {
                    notificationResults[notificationId] = true
               } else {
                    console.error('Expo push failed', {
                         notificationId,
                         error: ticket.details?.error,
                         message: ticket.message,
                    })
               }
          }
     }

     // 6. Final update per notification
     for (const notification of notifications) {
          const notificationId = notification.id
          const wasSuccessful = notificationResults[notificationId]

          if (wasSuccessful) {
               await supabase
                    .from('tblNotificationQueue')
                    .update({
                         status: 'sent',
                         sent_at: new Date(),
                    })
                    .eq('id', notificationId)
          } else {
               const attempts = (notification.attempts ?? 0) + 1

               await supabase
                    .from('tblNotificationQueue')
                    .update({
                         status: attempts >= MAX_RETRIES ? 'failed' : 'pending',
                         attempts,
                    })
                    .eq('id', notificationId)
          }
     }

     return NextResponse.json({
          processed: notifications.length,
     })
}