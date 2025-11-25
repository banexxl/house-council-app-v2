import { NextResponse } from 'next/server';

import {
  listStorageObjects,
  removeStorageObject,
  uploadStorageObject,
} from 'src/libs/supabase/sb-storage';
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
  const limit = url.searchParams.get('limit');
  const offset = url.searchParams.get('offset');
  const search = url.searchParams.get('search') || undefined;

  const storagePrefix = ['clients', auth.userId, prefix].filter(Boolean).join('/');

  const result = await listStorageObjects({
    prefix: storagePrefix,
  });

  if (!result.success || !result.items) {
    return NextResponse.json({ error: result.error ?? 'Unable to list files' }, { status: 500 });
  }

  const basePrefix = ['clients', clientId].join('/');
  let items = result.items.map((item) => {
    const path = item.path.startsWith(`${basePrefix}/`) ? item.path.slice(basePrefix.length + 1) : item.path;
    return { ...item, path };
  });

  if (search) {
    const term = search.toLowerCase();
    items = items.filter((item) => item.name.toLowerCase().includes(term) || item.path.toLowerCase().includes(term));
  }

  const total = items.length;
  const start = offset ? Number(offset) : 0;
  const end = limit ? start + Number(limit) : total;
  const pageItems = items.slice(start, end);

  return NextResponse.json({
    items: pageItems,
    count: total,
  });
}

export async function POST(request: Request) {
  const auth = await ensureUserId();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  const { userId } = auth;
  const { client, clientMember } = await getViewer();
  const clientId = client?.id ?? clientMember?.client_id ?? null;
  if (!clientId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const path = normalizeSegment((formData.get('path') ?? '') as string);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  const targetPath = ['clients', userId, path || file.name].filter(Boolean).join('/');
  const result = await uploadStorageObject({
    path: targetPath,
    file,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'Upload failed' }, { status: 500 });
  }

  return NextResponse.json({
    path: result.path
      ? result.path.replace(/^clients\/[^/]+\//, '')
      : targetPath.replace(/^clients\/[^/]+\//, ''),
  });
}

export async function PUT(request: Request) {
  const auth = await ensureUserId();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  const { client, clientMember } = await getViewer();
  const clientId = client?.id ?? clientMember?.client_id ?? null;
  if (!clientId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const path = normalizeSegment(body?.path);
  const newName = normalizeSegment(body?.newName);
  const bucket = body?.bucket || undefined;

  if (!path || !newName) {
    return NextResponse.json({ error: 'path and newName are required' }, { status: 400 });
  }

  const fullPath = ['clients', auth.userId, path].filter(Boolean).join('/');
  const parentParts = fullPath.split('/').filter(Boolean);
  parentParts.pop();
  const newFullPath = [...parentParts, newName].join('/');

  const supabase = await useServerSideSupabaseAnonClient();
  const { error } = await supabase.storage.from(bucket || process.env.SUPABASE_S3_CLIENTS_DATA_BUCKET!).move(fullPath, newFullPath);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const relativeParent = path.split('/').filter(Boolean);
  relativeParent.pop();
  const newRelative = [...relativeParent, newName].join('/');

  return NextResponse.json({ path: newRelative });
}

export async function DELETE(request: Request) {
  const auth = await ensureUserId();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  const { userId } = auth;
  const { client, clientMember } = await getViewer();
  const clientId = client?.id ?? clientMember?.client_id ?? null;
  if (!clientId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const path = normalizeSegment(body?.path);

  if (!path) {
    return NextResponse.json({ error: 'path is required' }, { status: 400 });
  }

  const result = await removeStorageObject({
    path: ['clients', userId, path].filter(Boolean).join('/'),
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'Delete failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
