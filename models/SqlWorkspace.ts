import mongoose, { Schema } from 'mongoose';

const SqlWorkspaceSchema = new Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  roomKey: { type: Schema.Types.ObjectId, required: true, unique: true, index: true },
  image: { type: Buffer, required: true },
  schema: { type: Schema.Types.Mixed, default: [] },
  revision: { type: Number, default: 1 },
}, { timestamps: true });

export default mongoose.models.SqlWorkspace || mongoose.model('SqlWorkspace', SqlWorkspaceSchema);
