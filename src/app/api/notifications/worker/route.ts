import { NextRequest, NextResponse } from 'next/server'
import { Expo } from 'expo-server-sdk'
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server'

const expo = new Expo()
const MAX_RETRIES = 5

export async function POST(req: NextRequest) {
     console.log('--- CRON START ---')

     const authHeader = req.headers.get('x-cron-secret')

     if (authHeader !== process.env.X_CRON_SECRET) {
          console.error('Unauthorized cron call')
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
     }

     const supabase = await useServerSideSupabaseAnonClient()

     // 1. Fetch notifications
     const { data: notifications, error } = await supabase
          .from('tblNotificationQueue')
          .select('*')
          .eq('status', 'pending')
          .limit(50)

     console.log('Fetched notifications:', notifications?.length)

     if (error) {
          console.error('Error fetching notifications:', error)
          return NextResponse.json({ error: 'DB error' }, { status: 500 })
     }

     if (!notifications?.length) {
          console.log('No notifications to process')
          return NextResponse.json({ processed: 0 })
     }

     // 2. Mark as processing + increment attempts
     for (const n of notifications) {
          console.log('Updating to processing:', n.id)

          const { error: updateError } = await supabase
               .from('tblNotificationQueue')
               .update({
                    status: 'processing',
                    attempts: (n.attempts ?? 0) + 1,
               })
               .eq('id', n.id)

          if (updateError) {
               console.error('Error updating to processing:', n.id, updateError)
          }
     }

     // 3. Fetch tokens
     const userIds = [...new Set(notifications.map((n) => n.user_id))]

     console.log('User IDs:', userIds)

     const { data: tokens, error: tokenError } = await supabase
          .from('tblUserPushTokens')
          .select('user_id, push_token')
          .in('user_id', userIds)

     if (tokenError) {
          console.error('Error fetching tokens:', tokenError)
     }

     console.log('Fetched tokens:', tokens)

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
          console.log('Processing notification:', notification.id)

          const userTokens = tokensByUser.get(notification.user_id) ?? []

          console.log('USER TOKENS RAW:', {
               notificationId: notification.id,
               userId: notification.user_id,
               tokens: userTokens,
          })

          const validTokens = userTokens.filter((t) =>
               Expo.isExpoPushToken(t)
          )

          console.log('VALID TOKENS:', {
               notificationId: notification.id,
               validTokens,
          })

          if (!validTokens.length) {
               console.error('NO VALID TOKENS → marking failed', notification.id)

               await supabase
                    .from('tblNotificationQueue')
                    .update({ status: 'failed' })
                    .eq('id', notification.id)

               continue
          }

          for (const token of validTokens) {
               const payload = {
                    to: token,
                    sound: 'default',
                    title: notification.title,
                    body: notification.body,
                    data:
                         typeof notification.data === 'object'
                              ? notification.data
                              : {},
                    channelId: 'default',
               }

               console.log('PUSH PAYLOAD:', payload)

               messages.push(payload)

               messageMeta.push({
                    notificationId: notification.id,
               })
          }
     }

     console.log('Total messages to send:', messages.length)

     if (!messages.length) {
          console.log('No messages created → exiting')
          return NextResponse.json({ processed: 0 })
     }

     const chunks = expo.chunkPushNotifications(messages)

     const notificationResults: Record<string, boolean> = {}

     let globalIndex = 0

     // 5. Send notifications
     for (const chunk of chunks) {
          console.log('Sending chunk:', chunk.length)

          const tickets = await expo.sendPushNotificationsAsync(chunk)

          console.log('Expo tickets:', JSON.stringify(tickets, null, 2))

          for (let i = 0; i < tickets.length; i++) {
               const ticket = tickets[i]
               const notificationId = messageMeta[globalIndex].notificationId

               console.log('Ticket result:', {
                    notificationId,
                    ticket,
               })

               globalIndex++

               if (!notificationResults[notificationId]) {
                    notificationResults[notificationId] = false
               }

               if (ticket.status === 'ok') {
                    notificationResults[notificationId] = true
               } else {
                    console.error('Expo push failed:', {
                         notificationId,
                         error: ticket.details?.error,
                         message: ticket.message,
                    })
               }
          }
     }

     console.log('Aggregated results:', notificationResults)

     // 6. Final DB update
     for (const notification of notifications) {
          const notificationId = notification.id
          const wasSuccessful = notificationResults[notificationId]

          console.log('Finalizing notification:', {
               notificationId,
               wasSuccessful,
          })

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

               console.log('Marking failed/pending:', {
                    notificationId,
                    attempts,
               })

               await supabase
                    .from('tblNotificationQueue')
                    .update({
                         status: attempts >= MAX_RETRIES ? 'failed' : 'pending',
                         attempts,
                    })
                    .eq('id', notificationId)
          }
     }

     console.log('--- CRON END ---')

     return NextResponse.json({
          processed: notifications.length,
     })
}