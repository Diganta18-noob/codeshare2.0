import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, clearTokenCookie } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// POST /api/auth/logout — Clear the auth cookie
export async function POST(request: NextRequest) {
  const payload = authenticateRequest(request);

  if (payload) {
    await logAudit({
      action: 'user.logout',
      userId: payload.userId,
      targetType: 'user',
      request,
    });
  }

  const response = NextResponse.json({ success: true });
  response.headers.set('Set-Cookie', clearTokenCookie());
  return response;
}
