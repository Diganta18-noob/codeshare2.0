import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Room from '@/models/Room';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Simple hash function (no bcrypt dependency needed)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// POST /api/rooms/[roomId]/verify — Verify room password
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    await connectDB();
    const { roomId } = params;
    const { password } = await request.json();

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    const room = await Room.findOne({ roomId });
    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    if (!room.passwordHash) {
      // Room is not password-protected
      return NextResponse.json({ success: true });
    }

    const inputHash = hashPassword(password);
    if (inputHash === room.passwordHash) {
      let files = room.files || [];
      if (files.length === 0) {
        files = [{ name: 'index.js', code: room.code || '', language: room.language || 'javascript' }];
      }
      return NextResponse.json({
        success: true,
        code: room.code,
        language: room.language,
        files,
        createdAt: room.createdAt,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Incorrect password' },
        { status: 403 }
      );
    }
  } catch (error: any) {
    console.error('[API] Password verify failed:', error.message);
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
