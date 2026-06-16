import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/mongodb';
import Room from '@/models/Room';
import rateLimit from '@/lib/rateLimit';

const limiter = rateLimit({
  interval: 10 * 1000, // 10 seconds
  uniqueTokenPerInterval: 500,
});

function generateRoomId(): string {
  return crypto.randomBytes(8).toString('base64url').slice(0, 10);
}

// POST /api/rooms — Create a new room
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
    await limiter.check(5, ip); // Limit to 5 requests per 10 seconds per IP
  } catch {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    await connectDB();
    const roomId = generateRoomId();

    await Room.create({
      roomId,
      code: '',
      language: 'javascript',
    });

    return NextResponse.json({ roomId }, { status: 201 });
  } catch (error: any) {
    console.error('[API] Failed to create room:', error.message);
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    );
  }
}
