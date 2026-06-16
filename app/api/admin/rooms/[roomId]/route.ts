import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';
import Room from '@/models/Room';
import { logAudit } from '@/lib/audit';
import { globalCache } from '@/lib/cache';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const admin = requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { roomId } = params;

  try {
    await connectDB();
    const room = await Room.findOne({ roomId });
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    await Room.deleteOne({ roomId });

    await logAudit({
      request,
      action: 'room.delete',
      userId: admin.userId,
      targetId: roomId,
      targetType: 'room',
      metadata: { details: `Deleted room ${roomId} (language: ${room.language})` },
    });

    // Invalidate server cache on delete
    globalCache.clear();

    return NextResponse.json({
      success: true,
      message: 'Room deleted successfully',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
