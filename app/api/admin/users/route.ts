import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';
import User from '@/models/User';
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
    const status = searchParams.get('status') || '';
    const role = searchParams.get('role') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const refresh = searchParams.get('refresh') === 'true';

    const cacheKey = `users_q:${query}_s:${status}_r:${role}_p:${page}_l:${limit}`;

    if (!refresh) {
      const cachedData = globalCache.get<any>(cacheKey);
      if (cachedData) {
        return NextResponse.json({
          success: true,
          cached: true,
          timestamp: cachedData.timestamp,
          users: cachedData.users,
          pagination: cachedData.pagination,
        });
      }
    }

    await connectDB();
    const skip = (page - 1) * limit;
    const filter: any = {};

    if (query) {
      filter.$or = [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (role) {
      filter.role = role;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter)
    ]);

    const responseData = {
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      timestamp: Date.now()
    };

    // Cache for 30 seconds
    globalCache.set(cacheKey, responseData, 30);

    return NextResponse.json({
      success: true,
      cached: false,
      ...responseData
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
