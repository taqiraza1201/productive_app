import mongoose, { Document, Schema, Types } from "mongoose";

export interface ITask extends Document {
  title: string;
  description: string;
  completed: boolean;
  status: "PENDING" | "DONE" | "STUCK";
  doneNote: string;
  stuckNote: string;
  doneWhatLearned: string;
  doneWhatCompleted: string;
  doneEvidenceType: "notes" | "commands" | "code_snippet" | "writeup";
  doneEvidenceText: string;
  stuckReason: "procrastination" | "distraction" | "confusion" | "burnout" | "fear_of_difficulty" | "poor_planning" | "tiredness" | "other" | "";
  stuckExplanation: string;
  statusUpdatedAt: Date | null;
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
    status: { type: String, enum: ["PENDING", "DONE", "STUCK"], default: "PENDING" },
    doneNote: { type: String, default: "", trim: true, maxlength: 2000 },
    stuckNote: { type: String, default: "", trim: true, maxlength: 2000 },
    doneWhatLearned: { type: String, default: "", trim: true, maxlength: 2000 },
    doneWhatCompleted: { type: String, default: "", trim: true, maxlength: 2000 },
    doneEvidenceType: { type: String, enum: ["notes", "commands", "code_snippet", "writeup"], default: "notes" },
    doneEvidenceText: { type: String, default: "", trim: true, maxlength: 5000 },
    stuckReason: {
      type: String,
      enum: ["procrastination", "distraction", "confusion", "burnout", "fear_of_difficulty", "poor_planning", "tiredness", "other", ""],
      default: "",
    },
    stuckExplanation: { type: String, default: "", trim: true, maxlength: 2000 },
    statusUpdatedAt: { type: Date, default: null },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    taskDate: { type: String, required: true }, // YYYY-MM-DD
  },
  { timestamps: true }
);

TaskSchema.index({ userId: 1, taskDate: -1 });
TaskSchema.index({ taskDate: -1, createdAt: -1 });

export const Task = mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);
