'use server'

import { revalidatePath } from "next/cache";
import { useServerSideSupabaseServiceRoleClient } from "src/libs/supabase/sb-server";
import { logServerAction } from "src/libs/supabase/server-logging";

export const startEnrollTOTP = async (sessionDataUserId: string) => {

     const supabase = await useServerSideSupabaseServiceRoleClient();

     const { data, error } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'NestLink 2FA TOTP',
          issuer: 'NestLink',
     })

     if (error) {
          await logServerAction({
               user_id: sessionDataUserId,
               action: 'Start Enroll TOTP - Error during supabase TOTP enrollment.',
               payload: {},
               status: 'fail',
               error: error.message,
               duration_ms: 0,
               type: 'auth'
          })
          return { error: error.message }
     }
     await logServerAction({
          user_id: sessionDataUserId,
          action: 'Start Enroll TOTP - Success.',
          payload: {},
          status: 'success',
          error: '',
          duration_ms: 0,
          type: 'auth'
     })
     return {
          id: data.id,
          type: data.type,
          qr_code: data.totp.qr_code,
          secret: data.totp.secret,
     }
}

export async function challengeTOTP(factorId: string, sessionUserId: string) {
     const supabase = await useServerSideSupabaseServiceRoleClient()

     const { data, error } = await supabase.auth.mfa.challenge({ factorId })

     if (error) {
          await logServerAction({
               user_id: sessionUserId,
               action: 'TOTP Challenge - Error',
               payload: { factorId },
               status: 'fail',
               error: error.message,
               duration_ms: 0,
               type: 'auth'
          })
          return { success: false, error: error.message }
     }

     return { success: true, challengeId: data.id }
}

export async function verifyTOTPEnrollment(factorId: string, code: string, challengeId: string, sessionUserId: string) {

     const supabase = await useServerSideSupabaseServiceRoleClient()

     const { error } = await supabase.auth.mfa.verify({
          factorId,
          code,
          challengeId,
     })

     if (error) {
          await logServerAction({
               user_id: sessionUserId,
               action: 'Verify TOTP Enrollment - Error',
               payload: { factorId, challengeId },
               status: 'fail',
               error: error.message,
               duration_ms: 0,
               type: 'auth'
          })
          return { success: false, error: error.message }
     }

     return { success: true }
}

export async function disableTOTP(factorId: string, sessionUserId: string) {

     const supabase = await useServerSideSupabaseServiceRoleClient();

     const { error } = await supabase.auth.mfa.unenroll({
          factorId,
     })

     if (error) {
          await logServerAction({
               user_id: sessionUserId,
               action: 'Disable TOTP - Error during supabase TOTP disable.',
               payload: {},
               status: 'fail',
               error: error.message,
               duration_ms: 0,
               type: 'auth'
          })
          return { success: false, error: error.message }
     }
     await logServerAction({
          user_id: sessionUserId,
          action: 'Disable TOTP - Success.',
          payload: {},
          status: 'success',
          error: '',
          duration_ms: 0,
          type: 'auth'
     })
     revalidatePath(`/dashboard/account`)
     return { success: true }
}
