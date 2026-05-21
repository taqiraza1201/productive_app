import mongoose, { Document, Schema, Types } from "mongoose";

export interface IWeeklyReview extends Document {
  userId: Types.ObjectId;
  weekStartDate: string;
  improved: string;
  biggestConfusion: string;
  biggestDistraction: string;
  wastedMostTime: string;
  nextWeekTarget: string;
  createdAt: Date;
  updatedAt: Date;
}

const WeeklyReviewSchema = new Schema<IWeeklyReview>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    weekStartDate: { type: String, required: true, index: true },
    improved: { type: String, required: true, trim: true, maxlength: 3000 },
    biggestConfusion: { type: String, required: true, trim: true, maxlength: 3000 },
    biggestDistraction: { type: String, required: true, trim: true, maxlength: 3000 },
    wastedMostTime: { type: String, required: true, trim: true, maxlength: 3000 },
    nextWeekTarget: { type: String, required: true, trim: true, maxlength: 3000 },
  },
  { timestamps: true }
);

WeeklyReviewSchema.index({ userId: 1, weekStartDate: -1 }, { unique: true });

export const WeeklyReview = mongoose.models.WeeklyReview || mongoose.model<IWeeklyReview>("WeeklyReview", WeeklyReviewSchema);
