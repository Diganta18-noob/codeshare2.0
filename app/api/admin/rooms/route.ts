import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';
import Room from '@/models/Room';
import { globalCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const refresh = searchParams.get('refresh') === 'true';

    const cacheKey = `rooms_q:${query}_p:${page}_l:${limit}`;

    if (!refresh) {
      const cachedData = globalCache.get<any>(cacheKey);
      if (cachedData) {
        return NextResponse.json({
          success: true,
          cached: true,
          timestamp: cachedData.timestamp,
          rooms: cachedData.rooms,
          pagination: cachedData.pagination,
        });
      }
    }

    await connectDB();
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (query) {
      filter.$or = [
        { roomId: { $regex: query, $options: 'i' } },
        { language: { $regex: query, $options: 'i' } },
      ];
    }

    const [rooms, total] = await Promise.all([
      Room.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Room.countDocuments(filter)
    ]);

    const responseData = {
      rooms,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      timestamp: Date.now()
    };

    // Cache for 30 seconds
    globalCache.set(cacheKey, responseData, 30);

    return NextResponse.json({
      success: true,
      cached: false,
      ...responseData,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
