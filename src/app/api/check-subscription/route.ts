// app/api/subscription/check-past_due/route.ts
import { NextResponse } from 'next/server'
import { sendSubscriptionEndingNotificationToSupport, sendTrialEndingEmailToClient } from 'src/libs/email/node-mailer'
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server'
import { logServerAction } from 'src/libs/supabase/server-logging'

export async function POST() {

     const supabase = await useServerSideSupabaseAnonClient()

     await logServerAction({
          user_id: null,
          action: 'API check-subscription invoked',
          payload: { at: new Date().toISOString() },
          status: 'success',
          error: '',
          duration_ms: 0,
          type: 'action'
     })
     try {
          // Fetch all client subscriptions
          const { data: client_subscriptions, error } = await supabase
               .from('tblClient_Subscription')
               .select('id, client_id, status, next_payment_date')

          if (error) {
               await logServerAction({
                    user_id: null,
                    action: 'Get all clients subscriptions',
                    payload: {},
                    status: 'fail',
                    error: error?.message || '',
                    duration_ms: 0,
                    type: 'db'
               })
               return NextResponse.json({ success: false, error: error.message }, { status: 500 })
          }

          await logServerAction({
               user_id: null,
               action: 'Check all clients subscriptions - Started',
               payload: { total: (client_subscriptions || []).length },
               status: 'success',
               error: '',
               duration_ms: 0,
               type: 'db'
          })

          const now = new Date()
          let updatedCount = 0
          const results: Array<{
               clientId: string
               previousStatus: string
               newStatus: string
               nextPaymentDate: string | null
               action: 'expired->past_due' | 'reactivated' | 'canceled' | 'no-change'
          }> = []

          const allowedStatuses = new Set(['trialing', 'active', 'past_due', 'canceled'])
          const stats = {
               total: 0,
               skippedUnknown: 0,
               toPastDue: 0,
               reactivated: 0,
               alreadyPastDue: 0,
               canceled: 0,
               noChange: 0
          }

          for (const sub of client_subscriptions || []) {
               await logServerAction({
                    user_id: null,
                    action: 'Processing subscription',
                    payload: { subscriptionId: sub.id, clientId: sub.client_id, status: sub.status, next_payment_date: sub.next_payment_date },
                    status: 'success',
                    error: '',
                    duration_ms: 0,
                    type: 'action'
               })
               const nextPaymentDate = sub.next_payment_date ? new Date(sub.next_payment_date) : null

               if (!allowedStatuses.has(sub.status)) {
                    stats.skippedUnknown++
                    results.push({
                         clientId: sub.client_id,
                         previousStatus: sub.status,
                         newStatus: sub.status,
                         nextPaymentDate: nextPaymentDate ? nextPaymentDate.toISOString() : null,
                         action: 'no-change'
                    })
                    continue
               }

               let newStatus = sub.status
               let action: typeof results[number]['action'] = 'no-change'

               const isExpired = !!nextPaymentDate && nextPaymentDate < now

               // Transition rules:
               // trialing/active + expired => past_due
               if ((sub.status === 'trialing' || sub.status === 'active') && isExpired) {
                    newStatus = 'past_due'
                    action = 'expired->past_due'
               }
               // past_due but now has a future payment date => reactivate to active
               else if (sub.status === 'past_due' && nextPaymentDate && nextPaymentDate >= now) {
                    newStatus = 'active'
                    action = 'reactivated'
               }
               // canceled stays canceled (no auto change)
               else if (sub.status === 'canceled') {
                    action = 'canceled'
               } else if (sub.status === 'past_due') {
                    // still past due, no future date
                    action = 'no-change'
               }

               if (newStatus !== sub.status) {
                    const { error: updateError } = await supabase
                         .from('tblClient_Subscription')
                         .update({ status: newStatus, updated_at: now.toISOString() })
                         .eq('id', sub.id)

                    if (action === 'expired->past_due') {
                         console.log('[check-subscription] -> past_due', {
                              subscriptionId: sub.id,
                              clientId: sub.client_id,
                              from: sub.status,
                              to: newStatus,
                              nextPaymentDate: nextPaymentDate?.toISOString() || null
                         })
                    }

                    await logServerAction({
                         user_id: null,
                         action: 'Subscription status transition',
                         payload: { subscriptionId: sub.id, clientId: sub.client_id, from: sub.status, to: newStatus, action },
                         status: updateError ? 'fail' : 'success',
                         error: updateError?.message || '',
                         duration_ms: 0,
                         type: 'db'
                    })
                    if (!updateError) {
                         updatedCount++
                         if (action === 'expired->past_due') stats.toPastDue++
                         if (action === 'reactivated') stats.reactivated++
                    }
               } else {
                    if (newStatus === 'past_due') stats.alreadyPastDue++
                    else if (newStatus === 'canceled') stats.canceled++
                    else stats.noChange++
               }

               // Log if subscription is set to expire in exactly 7, 3, or 1 days (only for trialing/active)
               if (nextPaymentDate && (newStatus === 'trialing' || newStatus === 'active')) {
                    const daysUntilExpiration = Math.ceil(
                         (nextPaymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                    )

                    await logServerAction({
                         user_id: null,
                         action: 'Evaluated subscription expiration window',
                         payload: { subscriptionId: sub.id, clientId: sub.client_id, daysUntilExpiration },
                         status: 'success',
                         error: '',
                         duration_ms: 0,
                         type: 'action'
                    })

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

                         let sendExpirationEmailToClientResponse: any = null;
                         try {
                              sendExpirationEmailToClientResponse = await sendTrialEndingEmailToClient({ to: clientEmail, daysRemaining: daysUntilExpiration })
                         } catch (e: any) {
                              await logServerAction({
                                   user_id: null,
                                   action: 'sendTrialEndingEmailToClient failed',
                                   payload: { clientId: sub.client_id, subscriptionId: sub.id, clientEmail, daysUntilExpiration },
                                   status: 'fail',
                                   error: e?.message || 'unknown',
                                   duration_ms: 0,
                                   type: 'action'
                              })
                         }

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
                         let sendSubscriptionEndingNotificationToSupportResponse: any = null;
                         try {
                              sendSubscriptionEndingNotificationToSupportResponse = await sendSubscriptionEndingNotificationToSupport({ daysRemaining: daysUntilExpiration, clientEmail, clientId: sub.client_id })
                         } catch (e: any) {
                              await logServerAction({
                                   user_id: null,
                                   action: 'sendSubscriptionEndingNotificationToSupport failed',
                                   payload: { clientId: sub.client_id, subscriptionId: sub.id, clientEmail, daysUntilExpiration },
                                   status: 'fail',
                                   error: e?.message || 'unknown',
                                   duration_ms: 0,
                                   type: 'action'
                              })
                         }

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

               results.push({
                    clientId: sub.client_id,
                    previousStatus: sub.status,
                    newStatus,
                    nextPaymentDate: nextPaymentDate ? nextPaymentDate.toISOString() : null,
                    action
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
               stats,
               results
          })
     } catch (e: any) {
          await logServerAction({
               user_id: null,
               action: 'Check all clients subscriptions - Uncaught Error',
               payload: {},
               status: 'fail',
               error: e?.message || 'unknown',
               duration_ms: 0,
               type: 'action'
          })
          return NextResponse.json({ success: false, error: e?.message || 'Internal error' }, { status: 500 })
     }
}