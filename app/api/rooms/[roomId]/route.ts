import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Room from '@/models/Room';

export const dynamic = 'force-dynamic';

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
      });
    }

    return NextResponse.json({
      roomId: room.roomId,
      code: room.code,
      language: room.language,
    });
  } catch (error: any) {
    console.error('[API] Failed to fetch room:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch room' },
      { status: 500 }
    );
  }
}

// PATCH /api/rooms/[roomId] — Update room code/language
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

    const room = await Room.findOneAndUpdate(
      { roomId },
      { ...updateData, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      roomId: room.roomId,
      code: room.code,
      language: room.language,
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

    const room = await Room.findOneAndUpdate(
      { roomId },
      { ...updateData, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      roomId: room.roomId,
      code: room.code,
      language: room.language,
    });
  } catch (error: any) {
    console.error('[API] Failed to save room (beacon):', error.message);
    return NextResponse.json(
      { error: 'Failed to save room' },
      { status: 500 }
    );
  }
}
