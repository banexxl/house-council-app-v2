import { useServerSideSupabaseAnonClient } from "../supabase/sb-server"

export class NotificationService {
     static async sendToUser(
          userId: string,
          payload: {
               title: string
               body: string
               data?: Record<string, any>
          }
     ) {
          const supabase = await useServerSideSupabaseAnonClient()

          const { error } = await supabase
               .from('tblNotificationQueue')
               .insert({
                    user_id: userId,
                    title: payload.title,
                    body: payload.body,
                    data: payload.data ?? null,
                    status: 'pending'
               })

          if (error) {
               console.error('Failed to queue notification', error)
               throw error
          }
     }
}