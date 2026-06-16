import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/auth/me — Get the currently authenticated user
export async function GET(request: NextRequest) {
  const payload = authenticateRequest(request);

  if (!payload) {
    return NextResponse.json(
      { error: 'Not authenticated.' },
      { status: 401 }
    );
  }

  try {
    await connectDB();
    const user = await User.findById(payload.userId).select('-passwordHash');

    if (!user) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { error: `Account is ${user.status}.` },
        { status: 403 }
      );
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        bio: user.bio,
        loginCount: user.loginCount,
        roomsCreated: user.roomsCreated,
        totalEdits: user.totalEdits,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error: any) {
    console.error('[Auth] Me failed:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch user profile.' },
      { status: 500 }
    );
  }
}
