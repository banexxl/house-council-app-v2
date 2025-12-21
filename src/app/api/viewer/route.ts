import { NextResponse } from 'next/server';

import { getViewer } from 'src/libs/supabase/server-auth';

export async function GET() {
     try {
          const viewer = await getViewer();
          const status = viewer?.userData ? 200 : 401;
          return NextResponse.json(viewer, { status });
     } catch (error) {
          console.error('[api/viewer] Failed to load viewer', error);
          return NextResponse.json({ error: 'Failed to load viewer' }, { status: 500 });
     }
}
