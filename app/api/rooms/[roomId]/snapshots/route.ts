import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Snapshot from '@/models/Snapshot';

export const dynamic = 'force-dynamic';

// GET /api/rooms/[roomId]/snapshots — Fetch all snapshots for a room
export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    await connectDB();
    const { roomId } = params;

    const snapshots = await Snapshot.find({ roomId })
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({ success: true, snapshots });
  } catch (error: any) {
    console.error('[API] Failed to fetch snapshots:', error.message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch snapshots' },
      { status: 500 }
    );
  }
}

// POST /api/rooms/[roomId]/snapshots — Save a new manual or auto snapshot
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    await connectDB();
    const { roomId } = params;
    const body = await request.json();

    const { code, language, label } = body;
    if (code === undefined) {
      return NextResponse.json(
        { success: false, error: 'Code content is required' },
        { status: 400 }
      );
    }

    const snapshot = await Snapshot.create({
      roomId,
      code,
      language: language || 'javascript',
      label: label || '',
    });

    return NextResponse.json({ success: true, snapshot });
  } catch (error: any) {
    console.error('[API] Failed to create snapshot:', error.message);
    return NextResponse.json(
      { success: false, error: 'Failed to create snapshot' },
      { status: 500 }
    );
  }
}
