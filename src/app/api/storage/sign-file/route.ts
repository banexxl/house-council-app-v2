// app/api/storage/sign-file/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SB_SERVICE_KEY!; // keep server-only
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

export async function POST(req: Request) {
     try {
          const { bucket, path, ttlSeconds = 60 * 30 } = await req.json();
          if (!bucket || !path) {
               return NextResponse.json({ error: 'bucket and path are required' }, { status: 400 });
          }
          const normalizedPath = String(path).replace(/^\/+/, '');
          const ttl = Math.max(60, Math.min(ttlSeconds, 60 * 60 * 24 * 7)); // clamp to [1m,7d]
          const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(normalizedPath, ttl);

          if (error || !data?.signedUrl) {
               const status = (error as any)?.status ?? (error as any)?.statusCode;
               const message = error?.message ?? 'sign failed';
               const httpStatus =
                    status && Number(status) >= 400 && Number(status) < 600 ? Number(status) : 500;
               return NextResponse.json({ error: message }, { status: httpStatus });
          }
          return NextResponse.json({ signedUrl: data.signedUrl, ttlSeconds: ttl, path: normalizedPath });
     } catch (e: any) {
          return NextResponse.json({ error: e?.message ?? 'unexpected' }, { status: 500 });
     }
}
