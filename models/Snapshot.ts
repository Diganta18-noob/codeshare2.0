import mongoose, { Schema, Document } from 'mongoose';

export interface ISnapshot extends Document {
  roomId: string;
  code: string;
  language: string;
  label: string;
  createdAt: Date;
}

const SnapshotSchema = new Schema<ISnapshot>(
  {
    roomId: { type: String, required: true, index: true },
    code: { type: String, required: true },
    language: { type: String, default: 'javascript' },
    label: { type: String, default: '' },
  },
  { timestamps: true }
);

// Compound index for efficient queries: get latest snapshots for a room
SnapshotSchema.index({ roomId: 1, createdAt: -1 });

export default mongoose.models.Snapshot || mongoose.model<ISnapshot>('Snapshot', SnapshotSchema);
