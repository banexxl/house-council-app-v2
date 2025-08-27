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
     created_at: Date;
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

export const getAllLogsFromEmail = async (email: string): Promise<ServerLog[]> => {
     const supabase = await useServerSideSupabaseAnonClient();

     const { data, error } = await supabase
          .from("tblServerLogs")
          .select("id, created_at, payload") // include other columns if you need them
          .filter("payload->>email", "eq", email); // ✅ JSON path filter

     if (error) {
          console.error("Error fetching logs:", error);
          return [];
     }

     // Extract ip from payload for convenience
     const result = data.map((row: any) => ({
          ...row,
          ip: row.payload?.ip ?? null,
          email: row.payload?.email ?? null,
     }));

     return result as ServerLog[];
};
