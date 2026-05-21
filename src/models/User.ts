import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: "user" | "admin";
  isDisabled: boolean;
  currentStreak: number;
  bestStreak: number;
  totalTasksCompleted: number;
  totalActiveDays: number;
  lastActiveDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isDisabled: { type: Boolean, default: false },
    currentStreak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    totalTasksCompleted: { type: Number, default: 0 },
    totalActiveDays: { type: Number, default: 0 },
    lastActiveDate: { type: Date, default: null },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ currentStreak: -1, totalTasksCompleted: -1 });

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
