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

  const { customer } = await getViewer();
  const clientId = customer?.id ?? null;
  if (!clientId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const prefix = normalizeSegment(url.searchParams.get('prefix'));
  const bucket = process.env.SUPABASE_S3_CLIENTS_DATA_BUCKET!;
  const supabase = await useServerSideSupabaseAnonClient();
  const rootPrefix = ['clients', auth.userId, prefix].filter(Boolean).join('/');
  const basePrefix = ['clients', clientId].join('/');

  const totalsByExt: Record<string, { size: number; count: number }> = {};
  let totalSize = 0;
  const folderCounts: Record<string, number> = {};
  const folderSizes: Record<string, number> = {};
  const folderDates: Record<string, number | null> = {};

  const stack: string[] = [rootPrefix];
  const visited = new Set<string>();

  const toRelative = (fullPath: string) => {
    if (fullPath === basePrefix || fullPath === rootPrefix) return '';
    if (fullPath.startsWith(`${basePrefix}/`)) {
      return fullPath.slice(basePrefix.length + 1);
    }
    if (fullPath.startsWith(`${rootPrefix}/`)) {
      return fullPath.slice(rootPrefix.length + 1);
    }
    return fullPath;
  };

  const ensureFolderEntry = (relPath: string, createdAt?: string | null) => {
    if (folderCounts[relPath] === undefined) {
      folderCounts[relPath] = 0;
    }
    if (folderSizes[relPath] === undefined) {
      folderSizes[relPath] = 0;
    }
    if (folderDates[relPath] === undefined) {
      folderDates[relPath] = createdAt ? new Date(createdAt).getTime() : null;
    }
  };

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
          ensureFolderEntry(toRelative(nextPrefix), item.created_at ?? item.updated_at ?? item.last_accessed_at ?? null);
          const folderRelativePath = toRelative(nextPrefix);
          const parentParts = folderRelativePath.split('/').filter(Boolean);
          let cursor = '';
          ensureFolderEntry(cursor);
          folderCounts[cursor] += 1;
          for (const part of parentParts.slice(0, -1)) {
            cursor = cursor ? `${cursor}/${part}` : part;
            ensureFolderEntry(cursor);
            folderCounts[cursor] += 1;
          }
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

        const fileRelativePath = toRelative([folder, item.name].filter(Boolean).join('/'));
        const parts = fileRelativePath.split('/').filter(Boolean);
        let cursor = '';
        ensureFolderEntry(cursor);
        folderCounts[cursor] += 1;
        folderSizes[cursor] += size;
        for (const part of parts.slice(0, -1)) {
          cursor = cursor ? `${cursor}/${part}` : part;
          ensureFolderEntry(cursor);
          folderCounts[cursor] += 1;
          folderSizes[cursor] += size;
        }
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

    return NextResponse.json({ size: totalSize, totalsByExt, folderCounts, folderSizes, folderDates });
  } catch (error: any) {
    console.error('Failed to calculate storage size', error);
    return NextResponse.json({ error: 'Failed to calculate storage size' }, { status: 500 });
  }
}
