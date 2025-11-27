import { NextResponse } from 'next/server';

import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { getViewer } from 'src/libs/supabase/server-auth';

const normalizeSegment = (value?: string | null) => {
  if (!value) return '';
  return value.replace(/^\/+|\/+$/g, '');
};

const PAGE_LIMIT = 100;

const ensureUserId = async () => {
  const supabase = await useServerSideSupabaseAnonClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return { error: 'Not authenticated' } as const;
  }
  return { userId: data.user.id } as const;
};

export async function GET(request: Request) {
  const auth = await ensureUserId();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { client, clientMember } = await getViewer();
  const clientId = client?.id ?? clientMember?.client_id ?? null;
  if (!clientId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const prefix = normalizeSegment(url.searchParams.get('prefix'));
  const bucket = process.env.SUPABASE_S3_CLIENTS_DATA_BUCKET!;
  const supabase = await useServerSideSupabaseAnonClient();
  const rootPrefix = ['clients', auth.userId, prefix].filter(Boolean).join('/');

  const totalsByExt: Record<string, { size: number; count: number }> = {};
  let totalSize = 0;

  const stack: string[] = [rootPrefix];
  const visited = new Set<string>();

  const listFolder = async (folder: string) => {
    let offset = 0;
    while (true) {
      const { data, error } = await supabase.storage.from(bucket).list(folder || undefined, {
        limit: PAGE_LIMIT,
        offset: offset * PAGE_LIMIT,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) {
        throw new Error(error.message);
      }
      if (!data?.length) break;

      for (const item of data) {
        const isFolder = item.metadata === null;
        if (isFolder) {
          const nextPrefix = [folder, item.name].filter(Boolean).join('/');
          if (!visited.has(nextPrefix)) {
            stack.push(nextPrefix);
          }
          continue;
        }

        const size = item.metadata?.size ?? 0;
        totalSize += size;
        const extMatch = item.name?.split('.').pop();
        const ext = extMatch && extMatch !== item.name ? extMatch.toLowerCase() : 'other';
        const prev = totalsByExt[ext] ?? { size: 0, count: 0 };
        totalsByExt[ext] = {
          size: prev.size + size,
          count: prev.count + 1,
        };
      }

      if (data.length < PAGE_LIMIT) break;
      offset += 1;
    }
  };

  try {
    while (stack.length) {
      const current = stack.pop() ?? '';
      if (visited.has(current)) continue;
      visited.add(current);
      await listFolder(current);
    }

    return NextResponse.json({ size: totalSize, totalsByExt });
  } catch (error: any) {
    console.error('Failed to calculate storage size', error);
    return NextResponse.json({ error: 'Failed to calculate storage size' }, { status: 500 });
  }
}
