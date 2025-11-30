"use server";

import { NextResponse } from 'next/server';
import { approveAccessRequest } from 'src/app/actions/access-request/access-request-actions';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const payload = searchParams.get('payload') || '';
  const sig = searchParams.get('sig') || '';
  const action = (searchParams.get('action') || 'approve') as 'approve' | 'reject';

  const result = await approveAccessRequest(payload, sig, action);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, rejected: action === 'reject' });
}
