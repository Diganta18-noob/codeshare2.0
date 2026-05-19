import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/mongodb';
import Room from '@/models/Room';

function generateRoomId(): string {
  return crypto.randomBytes(8).toString('base64url').slice(0, 10);
}

// POST /api/rooms — Create a new room
export async function POST() {
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
