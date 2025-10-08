// app/api/storage/sign-file/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!; // keep server-only
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

export async function POST(req: Request) {
     try {
          const { bucket, path, ttlSeconds = 60 * 30 } = await req.json();
          if (!bucket || !path) {
               return NextResponse.json({ error: 'bucket and path are required' }, { status: 400 });
          }
          const ttl = Math.max(60, Math.min(ttlSeconds, 60 * 60 * 24 * 7)); // clamp to [1m,7d]
          const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, ttl);
          if (error || !data?.signedUrl) {
               return NextResponse.json({ error: error?.message ?? 'sign failed' }, { status: 500 });
          }
          return NextResponse.json({ signedUrl: data.signedUrl, ttlSeconds: ttl });
     } catch (e: any) {
          return NextResponse.json({ error: e?.message ?? 'unexpected' }, { status: 500 });
     }
}
