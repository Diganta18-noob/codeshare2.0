import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { hashPassword, signToken, createTokenCookie } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// POST /api/auth/register — Create a new user account
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { email, username, password } = body;

    // Validate input
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, username, and password are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 30) {
      return NextResponse.json(
        { error: 'Username must be between 3 and 30 characters.' },
        { status: 400 }
      );
    }

    // Check for valid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    // Check if email or username already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
      return NextResponse.json(
        { error: `An account with this ${field} already exists.` },
        { status: 409 }
      );
    }

    // Hash password and create user
    const hashed = await hashPassword(password);

    const user = await User.create({
      email: email.toLowerCase(),
      username,
      passwordHash: hashed,
      role: 'user',
      status: 'active',
      lastLogin: new Date(),
      loginCount: 1,
    });

    // Generate JWT
    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
    });

    // Audit log
    await logAudit({
      action: 'user.register',
      userId: user._id.toString(),
      targetId: user._id.toString(),
      targetType: 'user',
      metadata: { email: user.email, username: user.username },
      request,
    });

    // Set cookie and return
    const response = NextResponse.json(
      {
        user: {
          id: user._id.toString(),
          email: user.email,
          username: user.username,
          role: user.role,
          status: user.status,
        },
        token,
      },
      { status: 201 }
    );

    response.headers.set('Set-Cookie', createTokenCookie(token));
    return response;
  } catch (error: any) {
    console.error('[Auth] Register failed:', error.message);
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
