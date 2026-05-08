import mongoose, { Document, Schema, Types } from "mongoose";

export interface ITask extends Document {
  title: string;
  description: string;
  completed: boolean;
  userId: Types.ObjectId;
  taskDate: string; // YYYY-MM-DD
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", trim: true, maxlength: 2000 },
    completed: { type: Boolean, default: false },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    taskDate: { type: String, required: true }, // YYYY-MM-DD
  },
  { timestamps: true }
);

TaskSchema.index({ userId: 1, taskDate: -1 });
TaskSchema.index({ taskDate: -1, createdAt: -1 });

export const Task = mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);
