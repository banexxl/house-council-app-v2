// app/api/subscription/check-expired/route.ts
import { NextResponse } from 'next/server'
import { sendSubscriptionEndingNotificationToSupport, sendTrialEndingEmailToClient } from 'src/libs/email/node-mailer'
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server'
import { logServerAction } from 'src/libs/supabase/server-logging'

export async function POST() {

     const supabase = await useServerSideSupabaseAnonClient()

     // Fetch all client subscriptions
     const { data: client_subscriptions, error } = await supabase
          .from('tblClient_Subscription')
          .select('id, client_id, status, next_payment_date')

     if (error) {
          await logServerAction({
               user_id: null,
               action: 'Get all clients subscriptions',
               payload: {},
               status: error ? 'fail' : 'success',
               error: error?.message || '',
               duration_ms: 0,
               type: 'db'
          })
          return NextResponse.json({ success: false, error: error.message }, { status: 500 })
     }

     await logServerAction({
          user_id: null,
          action: 'Check all clients subscriptions - Started',
          payload: {},
          status: error ? 'fail' : 'success',
          error: '',
          duration_ms: 0,
          type: 'db'
     })

     const now = new Date()
     let updatedCount = 0
     const results: { clientId: string; susbcriptionStatus: string; expired: boolean }[] = []

     for (const sub of client_subscriptions || []) {
          const nextPaymentDate = sub.next_payment_date ? new Date(sub.next_payment_date) : null

          // Determine if the subscription is expired
          const isExpired =
               sub.status === 'canceled' ||
               (!!nextPaymentDate && nextPaymentDate < now)

          // If expired, soft-delete by updating status to 'expired'
          if (isExpired) {
               const { error: updateError } = await supabase
                    .from('tblClient_Subscription')
                    .update({
                         status: 'expired',
                         updated_at: now.toISOString()
                    })
                    .eq('id', sub.id)

               // Log the expiration action
               await logServerAction({
                    user_id: null,
                    action: 'Auto-expire subscription for client',
                    payload: { subscriptionId: sub.id, clientId: sub.client_id },
                    status: updateError ? 'fail' : 'success',
                    error: updateError?.message || '',
                    duration_ms: 0,
                    type: 'db'
               })

               if (!updateError) updatedCount++
          }

          // Log if subscription is set to expire in exactly 7, 3, or 1 days
          if (nextPaymentDate && sub.status !== 'expired') {
               const daysUntilExpiration = Math.ceil(
                    (nextPaymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
               )

               if ([7, 3, 1].includes(daysUntilExpiration)) {

                    const { data: clientData, error: clientError } = await supabase
                         .from('tblClients')
                         .select('email')
                         .eq('id', sub.client_id)
                         .single();

                    if (clientError) {
                         await logServerAction({
                              user_id: null,
                              action: 'Fetch client email - Error',
                              payload: { clientId: sub.client_id },
                              status: 'fail',
                              error: clientError.message,
                              duration_ms: 0,
                              type: 'db'
                         });
                         return NextResponse.json({ success: false, error: clientError.message }, { status: 500 });
                    }

                    const clientEmail = clientData?.email;

                    const sendExpirationEmailToClientResponse = await sendTrialEndingEmailToClient({ to: clientEmail, daysRemaining: daysUntilExpiration })

                    await logServerAction({
                         user_id: null,
                         action: `Sent upcoming expiration email to client ${daysUntilExpiration} day(s) in advance`,
                         payload: {
                              subscriptionId: sub.id,
                              clientId: sub.client_id,
                              clientEmail,
                              daysUntilExpiration,
                              sendExpirationEmailToClientResponse,
                         },
                         status: 'success',
                         error: '',
                         duration_ms: 0,
                         type: 'action'
                    });


                    const sendSubscriptionEndingNotificationToSupportResponse = await sendSubscriptionEndingNotificationToSupport({ daysRemaining: daysUntilExpiration, clientEmail, clientId: sub.client_id })

                    await logServerAction({
                         user_id: null,
                         action: `Upcoming expiration in ${daysUntilExpiration} day(s)`,
                         payload: {
                              subscriptionId: sub.id,
                              clientId: sub.client_id,
                              daysUntilExpiration,
                              expirationDate: nextPaymentDate.toISOString(),
                              sendExpirationEmailToClientResponse,
                              sendSubscriptionEndingNotificationToSupportResponse
                         },
                         status: 'success',
                         error: '',
                         duration_ms: 0,
                         type: 'db'
                    })
               }
          }

          // Add result to summary array
          results.push({
               clientId: sub.client_id,
               susbcriptionStatus: isExpired ? 'expired' : sub.status,
               expired: isExpired
          })
     }

     await logServerAction({
          user_id: null,
          action: 'Check all clients subscriptions - Completed',
          payload: { checked: results.length, 'updatedCount': updatedCount },
          status: 'success',
          error: '',
          duration_ms: 0,
          type: 'db'
     })

     // Return summary of operations
     return NextResponse.json({
          success: true,
          checked: results.length,
          updated: updatedCount,
          results
     })
}