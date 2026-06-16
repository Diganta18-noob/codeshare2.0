import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { comparePassword, signToken, createTokenCookie } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// POST /api/auth/login — Authenticate a user
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Check account status
    if (user.status === 'banned') {
      return NextResponse.json(
        { error: 'This account has been banned. Contact support for assistance.' },
        { status: 403 }
      );
    }

    if (user.status === 'suspended') {
      return NextResponse.json(
        { error: 'This account has been suspended. Contact support for assistance.' },
        { status: 403 }
      );
    }

    // Verify password
    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Update login tracking
    user.lastLogin = new Date();
    user.loginCount += 1;
    await user.save();

    // Generate JWT
    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
    });

    // Audit log
    const auditAction = user.role === 'admin' ? 'admin.login' : 'user.login';
    await logAudit({
      action: auditAction,
      userId: user._id.toString(),
      targetId: user._id.toString(),
      targetType: 'user',
      metadata: { email: user.email },
      request,
    });

    // Set cookie and return
    const response = NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
      },
      token,
    });

    response.headers.set('Set-Cookie', createTokenCookie(token));
    return response;
  } catch (error: any) {
    console.error('[Auth] Login failed:', error.message);
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
