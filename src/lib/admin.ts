import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { AdminAuditLog } from "@/models/AdminAuditLog";

let bootstrapAttempted = false;

export async function bootstrapAdminFromEnv() {
  if (bootstrapAttempted) return;
  bootstrapAttempted = true;

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminUsername = process.env.ADMIN_USERNAME?.trim() || "Admin";
  if (!adminEmail || !adminPassword) return;

  await connectDB();
  const existingAdmin = await User.findOne({ role: "admin" }).select("_id").lean();
  if (existingAdmin) return;

  const existingByEmail = await User.findOne({ email: adminEmail }).select("_id role").lean<{
    _id: { toString(): string };
    role: "user" | "admin";
  } | null>();

  if (existingByEmail) {
    if (existingByEmail.role !== "admin") {
      await User.findByIdAndUpdate(existingByEmail._id, { role: "admin", isDisabled: false });
    }
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  await User.create({
    username: adminUsername,
    email: adminEmail,
    password: hashedPassword,
    role: "admin",
    isPublic: false,
    isDisabled: false,
  });
}

export async function requireAdmin() {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) return null;

  await connectDB();
  const adminUser = await User.findOne({
    _id: session.user.id,
    role: "admin",
    isDisabled: { $ne: true },
  })
    .select("_id email username role isDisabled")
    .lean<{
      _id: { toString(): string };
      email: string;
      username: string;
      role: "admin";
      isDisabled: boolean;
    } | null>();

  return adminUser;
}

export async function logAdminAction(params: {
  adminUserId: string;
  action: string;
  targetType: "user" | "task" | "activity";
  targetId?: string | null;
  details?: Record<string, unknown>;
}) {
  const { adminUserId, action, targetType, targetId, details = {} } = params;
  await AdminAuditLog.create({
    adminUserId,
    action,
    targetType,
    targetId: targetId ?? null,
    details,
  });
}
