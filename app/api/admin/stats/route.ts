import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';
import User from '@/models/User';
import Room from '@/models/Room';
import AuditLog from '@/models/AuditLog';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const totalPads = await Room.countDocuments();

    // Calculate total edits
    const editsAggregation = await Room.aggregate([
      { $group: { _id: null, total: { $sum: '$totalEdits' } } }
    ]);
    const totalEdits = editsAggregation[0]?.total || 0;

    // Get active/recent pads
    const recentPads = await Room.find()
      .sort({ lastAccessedAt: -1, updatedAt: -1 })
      .limit(5);

    // Get recent audit logs
    const recentLogs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(10);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalPads,
        totalEdits,
      },
      recentPads,
      recentLogs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
