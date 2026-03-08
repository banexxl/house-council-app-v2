import { Expo } from 'expo-server-sdk'
import { useServerSideSupabaseAnonClient } from '../supabase/sb-server'

const expo = new Expo()

async function handlePushReceipts(
     tickets: any[],
     tokens: string[],
     supabase: any
) {
     const receiptIds: string[] = []

     for (const ticket of tickets) {
          if (ticket.status === 'ok') {
               receiptIds.push(ticket.id)
          }
     }

     const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds)

     for (const chunk of receiptIdChunks) {
          const receipts = await expo.getPushNotificationReceiptsAsync(chunk)
          console.log('Expo receipts', receipts)
          for (const receiptId in receipts) {
               const receipt = receipts[receiptId]

               if (receipt.status === 'error') {
                    if (receipt.details?.error === 'DeviceNotRegistered') {
                         const tokenIndex = receiptIds.indexOf(receiptId)

                         const invalidToken = tokens[tokenIndex]

                         if (invalidToken) {
                              console.log('Removing invalid token:', invalidToken)

                              await supabase
                                   .from('tblUserPushTokens')
                                   .delete()
                                   .eq('push_token', invalidToken)
                         }
                    }
               }
          }
     }
}

export async function sendPushNotification(
     tokens: string[],
     title: string,
     body: string,
     data?: Record<string, any>
) {
     const supabase = await useServerSideSupabaseAnonClient()

     const messages = tokens
          .filter(token => Expo.isExpoPushToken(token))
          .map(token => ({
               to: token,
               sound: 'default',
               title,
               body,
               data
          }))

     const chunks = expo.chunkPushNotifications(messages)

     const tickets = []

     for (const chunk of chunks) {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk)
          tickets.push(...ticketChunk)
     }

     await handlePushReceipts(tickets, tokens, supabase)

     return tickets
}