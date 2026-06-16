import mongoose, { Schema, Document } from 'mongoose';

export interface IRoomFileVersion {
  name: string;
  code: string;
  language: string;
}

export interface IRoomVersion extends Document {
  roomId: string;
  code: string;
  language: string;
  files: IRoomFileVersion[];
  savedBy: string | null; // socket ID or username
  createdAt: Date;
}

const RoomVersionSchema = new Schema<IRoomVersion>(
  {
    roomId: { type: String, required: true, index: true },
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
    savedBy: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } } // Only need createdAt for history
);

export default mongoose.models.RoomVersion || mongoose.model<IRoomVersion>('RoomVersion', RoomVersionSchema);
