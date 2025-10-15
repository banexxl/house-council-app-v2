import { NextRequest, NextResponse } from 'next/server'
import { TABLES } from 'src/libs/supabase/tables';
import { useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server'
import { logServerAction } from 'src/libs/supabase/server-logging'

// Expect a secret in header: x-cron-secret
const CRON_SECRET = process.env.X_CRON_SECRET_SHEDULER;

export async function POST(req: NextRequest) {

     const started = Date.now();
     const provided = req.headers.get('x-cron-secret');
     if (!CRON_SECRET || provided !== CRON_SECRET) {
          await logServerAction({
               user_id: null,
               action: 'cronPublishScheduledAuthFail',
               duration_ms: Date.now() - started,
               error: 'Unauthorized',
               payload: {},
               status: 'fail',
               type: 'auth'
          });
          return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
     }

     const supabase = await useServerSideSupabaseServiceRoleClient()

     // get all locations without building_id
     const { data, error } = await supabase
          .from(TABLES.BUILDING_LOCATIONS)
          .select('*')
          .is('building_id', null)

     // if there are no locations without building_id, that means all locations are taken
     if (error) {
          await logServerAction({
               user_id: null,
               action: 'Location Check - failed to fetch locations without building_id (every location is taken...)',
               payload: {},
               status: 'fail',
               error: error.message,
               duration_ms: 0,
               type: 'db'
          })
          return NextResponse.json({ success: false, error: error.message }, { status: 500 })
     }

     // if there are locations without building_id
     if (data) {

          // delete all locations without building_id
          const addressesDeleted = data.map(location => location.street_address + ', ' + location.street_number + ', ' + location.city);

          const { error: deleteError } = await supabase
               .from(TABLES.BUILDING_LOCATIONS)
               .delete()
               .in('id', data.map(location => location.id))

          if (deleteError) {
               await logServerAction({
                    user_id: null,
                    action: 'Location Check - failed to delete locations without building_id',
                    payload: { ids: data.map(location => location.id) },
                    status: 'fail',
                    error: deleteError.message,
                    duration_ms: 0,
                    type: 'db'
               })
               return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 })
          } else {
               await logServerAction({
                    user_id: null,
                    action: 'Location Check - successfully deleted locations without building_id',
                    payload: { ids: data.map(location => location.id) },
                    status: 'success',
                    error: '',
                    duration_ms: 0,
                    type: 'db'
               })
               return NextResponse.json({ success: true, addressesDeleted })
          }
     }
}
