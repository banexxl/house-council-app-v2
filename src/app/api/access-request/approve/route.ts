"use server";

import { NextResponse } from 'next/server';
import { approveAccessRequest } from 'src/app/actions/access-request/access-request-actions';

export async function GET(request: Request) {
     const { searchParams } = new URL(request.url);
     const payload = searchParams.get('payload') || '';
     const sig = searchParams.get('sig') || '';
     const action = (searchParams.get('action') || 'approve') as 'approve' | 'reject';
     const preferJson = searchParams.get('format') === 'json' || request.headers.get('accept')?.includes('application/json');

     const result = await approveAccessRequest(payload, sig, action);

     if (preferJson) {
          if (!result.success) {
               return NextResponse.json({ success: false, error: result.error, code: result.code }, { status: 400 });
          }
          return NextResponse.json({ success: true, rejected: result.rejected, email: result.email, name: result.name });
     }

     const redirectUrl = new URL('/auth/access-request/approval-result', request.url);
     redirectUrl.searchParams.set('status', result.success ? (action === 'reject' ? 'rejected' : 'success') : 'error');
     if (result.email) redirectUrl.searchParams.set('email', result.email);
     if (!result.success) {
          if (result.code) redirectUrl.searchParams.set('code', result.code);
          if (result.error) redirectUrl.searchParams.set('message', result.error);
     }

     return NextResponse.redirect(redirectUrl);
}
