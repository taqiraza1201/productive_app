import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Task } from "@/models/Task";
import { getTodayDateStr } from "@/lib/streak";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const user = await User.findById(session.user.id).lean<{
    _id: { toString(): string };
    username: string;
    email: string;
    currentStreak: number;
    bestStreak: number;
    totalTasksCompleted: number;
    totalActiveDays: number;
    lastActiveDate: Date | null;
    createdAt: Date;
  }>();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const totalUsers = await User.countDocuments();
  const rank = await User.countDocuments({
    $or: [
      { currentStreak: { $gt: user.currentStreak } },
      {
        currentStreak: user.currentStreak,
        totalTasksCompleted: { $gt: user.totalTasksCompleted },
      },
    ],
  });

  const todayStr = getTodayDateStr();
  const todayTasks = await Task.find({ userId: session.user.id, taskDate: todayStr }).lean();
  const totalTasks = await Task.countDocuments({ userId: session.user.id });
  const completedTasks = await Task.countDocuments({ userId: session.user.id, completed: true });
  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Last 7 days activity
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const recentTasks = await Task.find({
    userId: session.user.id,
    createdAt: { $gte: sevenDaysAgo },
  }).lean();

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      currentStreak: user.currentStreak,
      bestStreak: user.bestStreak,
      totalTasksCompleted: user.totalTasksCompleted,
      totalActiveDays: user.totalActiveDays,
      lastActiveDate: user.lastActiveDate,
      createdAt: user.createdAt,
    },
    ranking: { rank: rank + 1, total: totalUsers },
    todayTasks,
    completionPercentage: completionPct,
    recentTasks,
  });
}
