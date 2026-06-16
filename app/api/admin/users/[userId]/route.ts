import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';
import User from '@/models/User';
import { logAudit } from '@/lib/audit';
import { globalCache } from '@/lib/cache';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const admin = requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId } = params;

  try {
    await connectDB();
    const body = await request.json();
    const { status, role } = body;

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent self-demotion or self-suspension/banning
    if (user._id.toString() === admin.userId) {
      return NextResponse.json(
        { error: 'Cannot modify your own administrative account' },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (status) {
      updates.status = status;
      let action: any = 'user.update';
      if (status === 'suspended') action = 'user.suspend';
      else if (status === 'banned') action = 'user.ban';
      else if (status === 'active') action = 'user.unban';

      await logAudit({
        request,
        action,
        userId: admin.userId,
        targetId: user._id.toString(),
        targetType: 'user',
        metadata: { details: `Updated user status of ${user.username} to ${status}` },
      });
    }

    if (role) {
      updates.role = role;
      await logAudit({
        request,
        action: 'user.update',
        userId: admin.userId,
        targetId: user._id.toString(),
        targetType: 'user',
        metadata: { details: `Updated user role of ${user.username} to ${role}` },
      });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
    }).select('-passwordHash');

    // Invalidate server cache on update
    globalCache.clear();

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const admin = requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId } = params;

  try {
    await connectDB();
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user._id.toString() === admin.userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own administrative account' },
        { status: 400 }
      );
    }

    await User.findByIdAndDelete(userId);

    await logAudit({
      request,
      action: 'user.delete',
      userId: admin.userId,
      targetId: userId,
      targetType: 'user',
      metadata: { details: `Deleted user ${user.username} (${user.email})` },
    });

    // Invalidate server cache on delete
    globalCache.clear();

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
