import { NextResponse } from 'next/server';

import { createStorageFolder, removeStorageFolder } from 'src/libs/supabase/sb-storage';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { getViewer } from 'src/libs/supabase/server-auth';

const normalizeSegment = (value?: string | null) => {
  if (!value) return '';
  return value.replace(/^\/+|\/+$/g, '');
};

const ensureUserId = async () => {
  const supabase = await useServerSideSupabaseAnonClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return { error: 'Not authenticated' } as const;
  }
  return { userId: data.user.id } as const;
};

export async function POST(request: Request) {
  const auth = await ensureUserId();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  const { client, clientMember } = await getViewer();
  const clientId = client?.id ?? clientMember?.client_id ?? null;
  if (!clientId || !auth.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const prefix = normalizeSegment(body?.prefix);
  const folderName = normalizeSegment(body?.name);

  if (!folderName) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const fullPrefix = ['clients', auth.userId, prefix].filter(Boolean).join('/');

  const result = await createStorageFolder({
    prefix: fullPrefix,
    folderName: folderName,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'Unable to create folder' }, { status: 500 });
  }

  const relativePath = [prefix, folderName].filter(Boolean).join('/');
  return NextResponse.json({ path: relativePath });
}

export async function DELETE(request: Request) {
  const auth = await ensureUserId();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  const { client, clientMember } = await getViewer();
  const clientId = client?.id ?? clientMember?.client_id ?? null;
  if (!clientId || !auth.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const prefix = normalizeSegment(body?.prefix);

  if (!prefix) {
    return NextResponse.json({ error: 'prefix is required' }, { status: 400 });
  }

  const fullPrefix = ['clients', auth.userId, prefix].filter(Boolean).join('/');
  const result = await removeStorageFolder({
    prefix: fullPrefix,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'Unable to remove folder' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

const stripClientPrefix = (value: string, userId: string): string => {
  const normalized = normalizeSegment(value);
  if (!normalized.startsWith('clients/')) {
    return normalized;
  }
  const parts = normalized.split('/').filter(Boolean);
  // value can be "clients/<userId>/..." or "clients/<clientId>/..."
  if (parts.length >= 2 && parts[0] === 'clients') {
    return parts.slice(2).join('/');
  }
  return normalized;
};

export async function PUT(request: Request) {
  const auth = await ensureUserId();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  const { client, clientMember } = await getViewer();
  const clientId = client?.id ?? clientMember?.client_id ?? null;
  if (!clientId || !auth.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const prefix = stripClientPrefix(body?.prefix, auth.userId);
  const newName = normalizeSegment(body?.newName);

  if (!prefix || !newName) {
    return NextResponse.json({ error: 'prefix and newName are required' }, { status: 400 });
  }

  const supabase = await useServerSideSupabaseAnonClient();
  const bucket = process.env.SUPABASE_S3_CLIENTS_DATA_BUCKET!;
  const oldFullPrefix = ['clients', auth.userId, prefix].filter(Boolean).join('/');
  const parts = prefix.split('/').filter(Boolean);
  parts.pop();
  const newFullPrefix = ['clients', auth.userId, ...parts, newName].filter(Boolean).join('/');

  try {
    const pathsToMove: { from: string; to: string }[] = [];
    let offset = 0;
    const limit = 100;
    while (true) {
      const { data, error } = await supabase.storage.from(bucket).list(oldFullPrefix || undefined, {
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const entries = data ?? [];
      for (const entry of entries) {
        const currentPath = [oldFullPrefix, entry.name].filter(Boolean).join('/');
        const targetPath = [newFullPrefix, entry.name].filter(Boolean).join('/');
        pathsToMove.push({ from: currentPath, to: targetPath });
        if (entry.metadata === null) {
          // nested folder: recurse by listing under it
          const stack = [{ prefix: currentPath, toPrefix: targetPath }];
          while (stack.length) {
            const { prefix: pf, toPrefix } = stack.pop()!;
            let innerOffset = 0;
            while (true) {
              const { data: innerData, error: innerError } = await supabase.storage.from(bucket).list(pf, {
                limit,
                offset: innerOffset,
                sortBy: { column: 'name', order: 'asc' },
              });
              if (innerError) {
                return NextResponse.json({ error: innerError.message }, { status: 500 });
              }
              const innerEntries = innerData ?? [];
              for (const entryInner of innerEntries) {
                const innerFrom = [pf, entryInner.name].join('/');
                const innerTo = [toPrefix, entryInner.name].join('/');
                pathsToMove.push({ from: innerFrom, to: innerTo });
                if (entryInner.metadata === null) {
                  stack.push({ prefix: innerFrom, toPrefix: innerTo });
                }
              }
              if (innerEntries.length < limit) break;
              innerOffset += limit;
            }
          }
        }
      }
      if (entries.length < limit) break;
      offset += limit;
    }

    // Move collected paths
    for (const pair of pathsToMove) {
      const { error } = await supabase.storage.from(bucket).move(pair.from, pair.to);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ path: [parts.join('/'), newName].filter(Boolean).join('/') });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Failed to rename folder' }, { status: 500 });
  }
}
