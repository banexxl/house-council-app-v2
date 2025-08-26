import { useServerSideSupabaseAnonClient } from "./sb-server";

export type LogType =
     | 'api'
     | 'db'
     | 'auth'
     | 'cron'
     | 'webhook'
     | 'action'
     | 'email'
     | 'external'
     | 'internal'
     | 'system'
     | 'unknown';

export type ServerLog = {
     id?: string;
     user_id: string | null;
     action: string;
     payload: any;
     status: 'success' | 'fail';
     error: string;
     duration_ms: number;
     type: LogType;
}

export const logServerAction = async ({
     user_id,
     action,
     payload,
     status,
     error,
     duration_ms,
     type
}: ServerLog) => {

     const supabase = await useServerSideSupabaseAnonClient();
     const { error: logInsertError } = await supabase.from('tblServerLogs').insert({
          user_id,
          action,
          payload,
          status,
          error,
          duration_ms,
          type
     })

}
