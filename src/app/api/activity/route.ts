import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Activity } from "@/models/Activity";
import { User } from "@/models/User";

export async function GET() {
  await connectDB();

  const recentActivity = await Activity.find({ isHidden: false })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean<Array<{
      _id: { toString(): string };
      userId: { toString(): string };
      taskId: { toString(): string };
      type: "DONE" | "STUCK";
      taskTitle: string;
      note: string;
      createdAt: Date;
    }>>();

  const userIds = [...new Set(recentActivity.map((a) => a.userId.toString()))];
  const users = await User.find({ _id: { $in: userIds }, isPublic: { $ne: false }, isDisabled: { $ne: true } }).select("username").lean<Array<{
    _id: { toString(): string };
    username: string;
  }>>();

  const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u.username]));

  const activity = recentActivity
    .filter((item) => Boolean(userMap[item.userId.toString()]))
    .map((item) => ({
      id: item._id.toString(),
      taskId: item.taskId.toString(),
      username: userMap[item.userId.toString()],
      type: item.type,
      action: item.type === "DONE" ? "completed a task" : "got stuck on a task",
      taskTitle: item.taskTitle,
      note: item.note,
      createdAt: item.createdAt,
    }));

  return NextResponse.json({ activity });
}
