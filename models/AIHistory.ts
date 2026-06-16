import mongoose, { Schema, Document } from 'mongoose';

export interface IAIHistory extends Omit<Document, 'model'> {
  userId?: mongoose.Types.ObjectId;
  roomId?: string;
  prompt: string;
  response: string;
  model: string;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  createdAt: Date;
}

const AIHistorySchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  roomId: { type: String, index: true },
  prompt: { type: String, required: true },
  response: { type: String, required: true },
  model: { type: String, default: 'gemini-3.5-flash' },
  tokensUsed: {
    prompt: { type: Number },
    completion: { type: Number },
    total: { type: Number }
  },
  createdAt: { type: Date, default: Date.now, index: true }
});

export default mongoose.models.AIHistory || mongoose.model<IAIHistory>('AIHistory', AIHistorySchema);
