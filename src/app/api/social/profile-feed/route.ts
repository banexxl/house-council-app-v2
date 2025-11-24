import { NextRequest, NextResponse } from 'next/server';
import { getActivePostsPaginatedByProfileId, getCurrentUserActivePostsPaginated } from 'src/app/actions/social/post-actions';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 25;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const requestedLimit = Number(searchParams.get('limit'));
  const requestedOffset = Number(searchParams.get('offset'));
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(Number.isFinite(requestedOffset) ? requestedOffset : 0, 0);
  const profileId = searchParams.get('profileId') || undefined;

  const result = profileId
    ? await getActivePostsPaginatedByProfileId({ profileId, limit, offset })
    : await getCurrentUserActivePostsPaginated({ limit, offset });

  if (!result.success || !result.data) {
    return NextResponse.json(
      { success: false, error: result.error ?? 'Unable to load profile feed' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      posts: result.data.posts,
      total: result.data.total,
    },
    { status: 200 }
  );
}
