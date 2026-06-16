import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';
import User from '@/models/User';
import Room from '@/models/Room';
import AuditLog from '@/models/AuditLog';
import { globalCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get('refresh') === 'true';

  if (!refresh) {
    const cachedStats = globalCache.get<any>('admin_stats');
    if (cachedStats) {
      return NextResponse.json({
        success: true,
        cached: true,
        timestamp: cachedStats.timestamp,
        stats: cachedStats.stats,
        recentPads: cachedStats.recentPads,
        recentLogs: cachedStats.recentLogs,
        languageStats: cachedStats.languageStats,
        activityStats: cachedStats.activityStats,
      });
    }
  }

  try {
    await connectDB();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalUsers,
      activeUsers,
      totalPads,
      editsAggregation,
      recentPads,
      recentLogs,
      languageStats,
      activityStats
    ] = await Promise.all([
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
        .limit(10),
      Room.aggregate([
        { $group: { _id: '$language', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const totalEdits = editsAggregation[0]?.total || 0;
    const now = Date.now();

    const responseData = {
      stats: {
        totalUsers,
        activeUsers,
        totalPads,
        totalEdits,
      },
      recentPads,
      recentLogs,
      languageStats,
      activityStats,
      timestamp: now,
    };

    // Cache for 60 seconds
    globalCache.set('admin_stats', responseData, 60);

    return NextResponse.json({
      success: true,
      cached: false,
      ...responseData,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
