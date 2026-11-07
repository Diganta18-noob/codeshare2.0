import mongoose, { Schema } from 'mongoose';

const SqlQuerySchema = new Schema({
  roomId: { type: String, required: true, index: true },
  roomKey: { type: Schema.Types.ObjectId, required: true },
  sql: { type: String, required: true, maxlength: 64000 },
  status: { type: String, enum: ['running', 'success', 'error'], default: 'running' },
  error: { type: String, default: null },
  diagnostic: { type: Schema.Types.Mixed, default: null },
  executionTime: { type: Number, default: null },
  databaseSaved: { type: Boolean, default: false },
  revision: { type: Number, default: null },
}, { timestamps: true });
SqlQuerySchema.index({ roomKey: 1, createdAt: -1, _id: -1 });
export default mongoose.models.SqlQuery || mongoose.model('SqlQuery', SqlQuerySchema);
