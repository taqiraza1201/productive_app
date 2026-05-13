import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Task } from "@/models/Task";
import { logAdminAction, requireAdmin } from "@/lib/admin";

const updateUserSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["setPublic", "setDisabled", "resetStreak"]),
  value: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (query) {
    filter.$or = [
      { username: { $regex: query, $options: "i" } },
      { email: { $regex: query, $options: "i" } },
    ];
  }

  const users = await User.find(filter)
    .select("username email role isPublic isDisabled currentStreak bestStreak totalTasksCompleted totalActiveDays createdAt")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean<Array<{
      _id: { toString(): string };
      username: string;
      email: string;
      role?: "user" | "admin";
      isPublic: boolean;
      isDisabled: boolean;
      currentStreak: number;
      bestStreak: number;
      totalTasksCompleted: number;
      totalActiveDays: number;
      createdAt: Date;
    }>>();

  const userIds = users.map((u) => u._id);
  const taskStats = await Task.aggregate<{ _id: unknown; totalTasks: number; doneTasks: number; stuckTasks: number }>([
    { $match: { userId: { $in: userIds } } },
    {
      $group: {
        _id: "$userId",
        totalTasks: { $sum: 1 },
        doneTasks: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: ["$status", "DONE"] },
                  {
                    $and: [
                      { $eq: [{ $ifNull: ["$status", null] }, null] },
                      { $eq: ["$completed", true] },
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
        stuckTasks: {
          $sum: {
            $cond: [{ $eq: ["$status", "STUCK"] }, 1, 0],
          },
        },
      },
    },
  ]);

  const statMap = new Map(taskStats.map((s) => [String(s._id), s]));

  const responseUsers = users.map((user) => {
    const stats = statMap.get(user._id.toString());
    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role ?? "user",
      isPublic: user.isPublic ?? true,
      isDisabled: user.isDisabled ?? false,
      currentStreak: user.currentStreak,
      bestStreak: user.bestStreak,
      totalTasksCompleted: user.totalTasksCompleted,
      totalActiveDays: user.totalActiveDays,
      createdAt: user.createdAt,
      stats: {
        totalTasks: stats?.totalTasks ?? 0,
        doneTasks: stats?.doneTasks ?? 0,
        stuckTasks: stats?.stuckTasks ?? 0,
      },
    };
  });

  return NextResponse.json({ users: responseUsers });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const { userId, action, value } = parsed.data;
  if (userId === admin._id.toString() && action === "setDisabled" && value === true) {
    return NextResponse.json({ error: "Admin cannot disable own account." }, { status: 400 });
  }

  await connectDB();

  if (action === "setPublic") {
    if (typeof value !== "boolean") return NextResponse.json({ error: "value is required." }, { status: 400 });
    const updated = await User.findByIdAndUpdate(userId, { isPublic: value }, { new: true }).select("_id").lean();
    if (!updated) return NextResponse.json({ error: "User not found." }, { status: 404 });
    await logAdminAction({
      adminUserId: admin._id.toString(),
      action: value ? "user_set_public" : "user_set_private",
      targetType: "user",
      targetId: userId,
      details: { isPublic: value },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "setDisabled") {
    if (typeof value !== "boolean") return NextResponse.json({ error: "value is required." }, { status: 400 });
    const updated = await User.findByIdAndUpdate(userId, { isDisabled: value }, { new: true }).select("_id").lean();
    if (!updated) return NextResponse.json({ error: "User not found." }, { status: 404 });
    await logAdminAction({
      adminUserId: admin._id.toString(),
      action: value ? "user_disabled" : "user_enabled",
      targetType: "user",
      targetId: userId,
      details: { isDisabled: value },
    });
    return NextResponse.json({ success: true });
  }

  const updated = await User.findByIdAndUpdate(
    userId,
    {
      currentStreak: 0,
      bestStreak: 0,
      totalActiveDays: 0,
      lastActiveDate: null,
    },
    { new: true }
  )
    .select("_id")
    .lean();
  if (!updated) return NextResponse.json({ error: "User not found." }, { status: 404 });

  await logAdminAction({
    adminUserId: admin._id.toString(),
    action: "user_streak_reset",
    targetType: "user",
    targetId: userId,
  });

  return NextResponse.json({ success: true });
}
