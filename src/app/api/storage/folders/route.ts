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
  if (!clientId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const prefix = normalizeSegment(body?.prefix);
  const folderName = normalizeSegment(body?.name);

  if (!folderName) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const fullPrefix = ['clients', clientId, prefix, folderName].filter(Boolean).join('/');

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
  if (!clientId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const prefix = normalizeSegment(body?.prefix);

  if (!prefix) {
    return NextResponse.json({ error: 'prefix is required' }, { status: 400 });
  }

  const fullPrefix = ['clients', clientId, prefix].filter(Boolean).join('/');
  const result = await removeStorageFolder({
    prefix: fullPrefix,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'Unable to remove folder' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
