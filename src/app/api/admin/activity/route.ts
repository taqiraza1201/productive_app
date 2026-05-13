import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { Activity } from "@/models/Activity";
import { User } from "@/models/User";
import { logAdminAction, requireAdmin } from "@/lib/admin";

const moderationSchema = z.object({
  activityId: z.string().min(1),
  hidden: z.boolean(),
});

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const hidden = searchParams.get("hidden");

  await connectDB();
  const filter: Record<string, unknown> = {};
  if (type && ["DONE", "STUCK"].includes(type)) filter.type = type;
  if (hidden === "true") filter.isHidden = true;
  if (hidden === "false") filter.isHidden = false;

  const activities = await Activity.find(filter)
    .sort({ createdAt: -1 })
    .limit(250)
    .lean<Array<{
      _id: { toString(): string };
      userId: { toString(): string };
      taskId: { toString(): string };
      type: "DONE" | "STUCK";
      taskTitle: string;
      note: string;
      isHidden: boolean;
      createdAt: Date;
    }>>();

  const userIds = [...new Set(activities.map((a) => a.userId.toString()))];
  const users = await User.find({ _id: { $in: userIds } }).select("username email").lean<Array<{
    _id: { toString(): string };
    username: string;
    email: string;
  }>>();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  return NextResponse.json({
    activities: activities.map((item) => {
      const user = userMap.get(item.userId.toString());
      return {
        id: item._id.toString(),
        user: user
          ? { id: item.userId.toString(), username: user.username, email: user.email }
          : { id: item.userId.toString(), username: "Unknown", email: "" },
        taskId: item.taskId.toString(),
        type: item.type,
        taskTitle: item.taskTitle,
        note: item.note,
        isHidden: item.isHidden,
        createdAt: item.createdAt,
      };
    }),
  });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = moderationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const { activityId, hidden } = parsed.data;
  await connectDB();

  const updated = await Activity.findByIdAndUpdate(
    activityId,
    {
      isHidden: hidden,
      hiddenByAdminId: hidden ? admin._id : null,
      hiddenAt: hidden ? new Date() : null,
    },
    { new: true }
  )
    .select("_id")
    .lean();

  if (!updated) return NextResponse.json({ error: "Activity not found." }, { status: 404 });

  await logAdminAction({
    adminUserId: admin._id.toString(),
    action: hidden ? "activity_hidden" : "activity_unhidden",
    targetType: "activity",
    targetId: activityId,
    details: { hidden },
  });

  return NextResponse.json({ success: true });
}
