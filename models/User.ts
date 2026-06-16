import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'banned';

export interface IUser extends Document {
  email: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  bio?: string;
  lastLogin?: Date;
  loginCount: number;
  roomsCreated: number;
  totalEdits: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'banned'],
      default: 'active',
    },
    avatar: { type: String, default: null },
    bio: { type: String, default: '', maxlength: 256 },
    lastLogin: { type: Date, default: null },
    loginCount: { type: Number, default: 0 },
    roomsCreated: { type: Number, default: 0 },
    totalEdits: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
