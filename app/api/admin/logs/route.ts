import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';
import AuditLog from '@/models/AuditLog';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (action) {
      filter.action = action;
    }

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AuditLog.countDocuments(filter);

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
