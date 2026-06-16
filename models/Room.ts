import mongoose, { Schema, Document } from 'mongoose';

export interface IRoomFile {
  name: string;
  code: string;
  language: string;
}

export interface IRoom extends Document {
  roomId: string;
  code: string;
  language: string;
  files: IRoomFile[];
  viewerCount: number;
  isLocked: boolean;
  passwordHash: string | null;
  // Ownership & tracking
  ownerId: string | null;
  title: string;
  totalEdits: number;
  totalViews: number;
  lastAccessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    code: { type: String, default: '' },
    language: { type: String, default: 'javascript' },
    files: {
      type: [
        {
          name: { type: String, required: true },
          code: { type: String, default: '' },
          language: { type: String, default: 'javascript' },
        },
      ],
      default: [],
    },
    viewerCount: { type: Number, default: 0 },
    isLocked: { type: Boolean, default: false },
    passwordHash: { type: String, default: null },
    // Ownership & tracking fields
    ownerId: { type: String, default: null, index: true },
    title: { type: String, default: 'Untitled Pad' },
    totalEdits: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    lastAccessedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for admin queries: list rooms by owner, by recent activity
RoomSchema.index({ ownerId: 1, updatedAt: -1 });
RoomSchema.index({ lastAccessedAt: -1 });

export default mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);
