import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICheckIn extends Document {
  userId: Types.ObjectId;
  date: string;
  studyMinutes: number;
  studied: string;
  biggestConfusion: string;
  tomorrowTarget: string;
  recoveryTask: "revise_notes" | "linux_command_practice" | "packet_analysis" | "focused_study_15m" | "";
  noZeroDaySaved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CheckInSchema = new Schema<ICheckIn>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true },
    studyMinutes: { type: Number, required: true, min: 0, max: 1440 },
    studied: { type: String, required: true, trim: true, maxlength: 2000 },
    biggestConfusion: { type: String, required: true, trim: true, maxlength: 2000 },
    tomorrowTarget: { type: String, required: true, trim: true, maxlength: 2000 },
    recoveryTask: {
      type: String,
      enum: ["revise_notes", "linux_command_practice", "packet_analysis", "focused_study_15m", ""],
      default: "",
    },
    noZeroDaySaved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CheckInSchema.index({ userId: 1, date: -1 }, { unique: true });

export const CheckIn = mongoose.models.CheckIn || mongoose.model<ICheckIn>("CheckIn", CheckInSchema);
