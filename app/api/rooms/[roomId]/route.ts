import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Room from '@/models/Room';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Simple hash function
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// GET /api/rooms/[roomId] — Fetch room data
export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    await connectDB();
    const { roomId } = params;

    let room = await Room.findOne({ roomId });

    // Auto-create room if it doesn't exist (upsert pattern)
    if (!room) {
      room = await Room.create({
        roomId,
        code: '',
        language: 'javascript',
        files: [{ name: 'index.js', code: '', language: 'javascript' }],
      });
    }

    let files = room.files || [];
    if (files.length === 0) {
      files = [{ name: 'index.js', code: room.code || '', language: room.language || 'javascript' }];
    }

    const hideContent = room.passwordHash && !room.isLocked;
    return NextResponse.json({
      roomId: room.roomId,
      code: hideContent ? '' : room.code,
      language: room.language,
      files: hideContent ? [] : files,
      isLocked: room.isLocked || false,
      hasPassword: !!room.passwordHash,
    });
  } catch (error: any) {
    console.error('[API] Failed to fetch room:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch room' },
      { status: 500 }
    );
  }
}

// PATCH /api/rooms/[roomId] — Update room code/language/lock/password/files
export async function PATCH(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    await connectDB();
    const { roomId } = params;
    const body = await request.json();

    const updateData: Record<string, any> = {};
    if (body.code !== undefined) updateData.code = body.code;
    if (body.language !== undefined) updateData.language = body.language;
    if (body.isLocked !== undefined) updateData.isLocked = body.isLocked;

    if (body.files !== undefined) {
      updateData.files = body.files;
      if (body.files.length > 0) {
        updateData.code = body.files[0].code;
        updateData.language = body.files[0].language;
      }
    }

    // Handle password setting/clearing
    if (body.password !== undefined) {
      if (body.password === null || body.password === '') {
        updateData.passwordHash = null;
      } else {
        updateData.passwordHash = hashPassword(body.password);
      }
    }

    const room = await Room.findOneAndUpdate(
      { roomId },
      { ...updateData, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      roomId: room.roomId,
      code: room.code,
      language: room.language,
      files: room.files || [],
      isLocked: room.isLocked || false,
      hasPassword: !!room.passwordHash,
    });
  } catch (error: any) {
    console.error('[API] Failed to update room:', error.message);
    return NextResponse.json(
      { error: 'Failed to update room' },
      { status: 500 }
    );
  }
}

// POST /api/rooms/[roomId] — Same as PATCH (used by navigator.sendBeacon on page unload)
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    await connectDB();
    const { roomId } = params;
    const body = await request.json();

    const updateData: Record<string, any> = {};
    if (body.code !== undefined) updateData.code = body.code;
    if (body.language !== undefined) updateData.language = body.language;

    if (body.files !== undefined) {
      updateData.files = body.files;
      if (body.files.length > 0) {
        updateData.code = body.files[0].code;
        updateData.language = body.files[0].language;
      }
    }

    const room = await Room.findOneAndUpdate(
      { roomId },
      { ...updateData, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      roomId: room.roomId,
      code: room.code,
      language: room.language,
      files: room.files || [],
    });
  } catch (error: any) {
    console.error('[API] Failed to save room (beacon):', error.message);
    return NextResponse.json(
      { error: 'Failed to save room' },
      { status: 500 }
    );
  }
}
