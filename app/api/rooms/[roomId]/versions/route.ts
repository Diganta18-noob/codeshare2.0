import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import RoomVersion from '@/models/RoomVersion';
import Room from '@/models/Room';

export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    await connectDB();
    const versions = await RoomVersion.find({ roomId: params.roomId })
      .sort({ createdAt: -1 })
      .limit(30) // Limit to the last 30 versions to avoid massive payloads
      .select('-__v')
      .lean();

    return NextResponse.json({ versions }, { status: 200 });
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    await connectDB();
    const body = await req.json();
    const { code, files, language, savedBy } = body;

    // Verify room exists
    const roomExists = await Room.exists({ roomId: params.roomId });
    if (!roomExists) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const newVersion = await RoomVersion.create({
      roomId: params.roomId,
      code,
      files,
      language,
      savedBy: savedBy || 'Anonymous',
    });

    // Enforce max 30 versions per room to save space
    const allVersions = await RoomVersion.find({ roomId: params.roomId })
      .sort({ createdAt: -1 })
      .select('_id');
    
    if (allVersions.length > 30) {
      const idsToDelete = allVersions.slice(30).map((v) => v._id);
      await RoomVersion.deleteMany({ _id: { $in: idsToDelete } });
    }

    return NextResponse.json({ version: newVersion }, { status: 201 });
  } catch (error) {
    console.error('Error creating version:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
