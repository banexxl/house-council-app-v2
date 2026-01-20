import { NextRequest, NextResponse } from 'next/server';
import { activateAllScheduledPolls } from 'src/app/actions/poll/poll-actions';
import { isUUIDv4 } from 'src/utils/uuid';

const SECURITY_KEY = process.env.X_CRON_SECRET!

export async function POST(req: NextRequest) {
     const key = req.headers.get('x-cron-secret');

     if (!key || key !== SECURITY_KEY) {
          return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
     }

     if (isUUIDv4(key) === false) {
          return NextResponse.json({ success: false, error: 'Invalid security key format' }, { status: 400 });
     }

     const result = await activateAllScheduledPolls();

     if (!result.success) {
          const status = result.error?.includes('not found') ? 404 :
               result.error?.includes('not scheduled') ? 400 :
                    result.error?.includes('future') ? 400 : 500;
          return NextResponse.json({ success: false, error: result.error }, { status });
     }

     return NextResponse.json({ success: true, polls: result.data }, { status: 200 });
}
