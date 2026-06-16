import mongoose, { Schema, Document } from 'mongoose';

export type AuditAction =
  | 'user.register'
  | 'user.login'
  | 'user.logout'
  | 'user.update'
  | 'user.suspend'
  | 'user.ban'
  | 'user.unban'
  | 'user.delete'
  | 'room.create'
  | 'room.delete'
  | 'room.lock'
  | 'room.unlock'
  | 'room.password.set'
  | 'room.password.remove'
  | 'admin.login'
  | 'admin.settings.update'
  | 'admin.user.role.change';

export interface IAuditLog extends Document {
  action: AuditAction;
  userId?: string;
  targetId?: string;
  targetType?: 'user' | 'room' | 'system';
  metadata?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, index: true },
    userId: { type: String, default: null, index: true },
    targetId: { type: String, default: null },
    targetType: {
      type: String,
      enum: ['user', 'room', 'system'],
      default: null,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true }
);

// Efficient querying: latest logs first, filter by action or user
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
