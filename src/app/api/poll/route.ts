import { NextRequest, NextResponse } from 'next/server';
import { activateScheduledPoll } from 'src/app/actions/poll/poll-actions';

const SECURITY_KEY = process.env.POLL_SCHEDULE_KEY!

export async function POST(req: NextRequest) {
     const key = req.headers.get('x-api-key');
     if (!key || key !== SECURITY_KEY) {
          return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
     }

     const { pollId } = await req.json();
     if (!pollId) {
          return NextResponse.json({ success: false, error: 'Missing pollId' }, { status: 400 });
     }

     const result = await activateScheduledPoll(pollId);
     if (!result.success) {
          const status = result.error?.includes('not found') ? 404 :
               result.error?.includes('not scheduled') ? 400 :
                    result.error?.includes('future') ? 400 : 500;
          return NextResponse.json({ success: false, error: result.error }, { status });
     }

     return NextResponse.json({ success: true, poll: result.data }, { status: 200 });
}
