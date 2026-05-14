import mongoose, { Document, Schema, Types } from "mongoose";

export interface IActivity extends Document {
  userId: Types.ObjectId;
  taskId: Types.ObjectId;
  type: "DONE" | "STUCK";
  taskTitle: string;
  note: string;
  isHidden: boolean;
  hiddenByAdminId: Types.ObjectId | null;
  hiddenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    type: { type: String, enum: ["DONE", "STUCK"], required: true },
    taskTitle: { type: String, required: true, trim: true, maxlength: 200 },
    note: { type: String, required: true, trim: true, maxlength: 2000 },
    isHidden: { type: Boolean, default: false, index: true },
    hiddenByAdminId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    hiddenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ActivitySchema.index({ createdAt: -1 });

export const Activity = mongoose.models.Activity || mongoose.model<IActivity>("Activity", ActivitySchema);
