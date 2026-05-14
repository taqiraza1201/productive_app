import mongoose, { Document, Schema, Types } from "mongoose";

export interface IAdminAuditLog extends Document {
  adminUserId: Types.ObjectId;
  action: string;
  targetType: "user" | "task" | "activity";
  targetId: Types.ObjectId | null;
  details: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AdminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    adminUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true, trim: true, maxlength: 100 },
    targetType: { type: String, enum: ["user", "task", "activity"], required: true, index: true },
    targetId: { type: Schema.Types.ObjectId, default: null, index: true },
    details: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

AdminAuditLogSchema.index({ createdAt: -1 });

export const AdminAuditLog =
  mongoose.models.AdminAuditLog || mongoose.model<IAdminAuditLog>("AdminAuditLog", AdminAuditLogSchema);
