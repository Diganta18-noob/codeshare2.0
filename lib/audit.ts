import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import AuditLog, { AuditAction } from '@/models/AuditLog';

interface AuditLogEntry {
  action: AuditAction;
  userId?: string | null;
  targetId?: string | null;
  targetType?: 'user' | 'room' | 'system';
  metadata?: Record<string, any>;
  request?: NextRequest;
}

/**
 * Write an audit log entry to the database.
 * Fire-and-forget — does not throw on failure.
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await connectDB();

    const ip = entry.request?.headers.get('x-forwarded-for')
      ?? entry.request?.headers.get('x-real-ip')
      ?? null;

    const userAgent = entry.request?.headers.get('user-agent') ?? null;

    await AuditLog.create({
      action: entry.action,
      userId: entry.userId ?? null,
      targetId: entry.targetId ?? null,
      targetType: entry.targetType ?? null,
      metadata: entry.metadata ?? {},
      ip: typeof ip === 'string' ? ip.split(',')[0].trim() : null,
      userAgent,
    });
  } catch (err) {
    // Audit logging should never break the main flow
    console.error('[Audit] Failed to write log:', err);
  }
}
