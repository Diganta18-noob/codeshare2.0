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
  },
  { timestamps: true }
);

export default mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);
