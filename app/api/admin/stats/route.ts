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

    const [totalUsers, activeUsers, totalPads, editsAggregation, recentPads, recentLogs] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      Room.countDocuments(),
      Room.aggregate([
        { $group: { _id: null, total: { $sum: '$totalEdits' } } }
      ]),
      Room.find()
        .sort({ lastAccessedAt: -1, updatedAt: -1 })
        .limit(5),
      AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
    ]);

    const totalEdits = editsAggregation[0]?.total || 0;

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
