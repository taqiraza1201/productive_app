import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Task } from "@/models/Task";

export async function GET() {
  await connectDB();

  const users = await User.find({})
    .select("username currentStreak bestStreak totalTasksCompleted totalActiveDays")
    .sort({ currentStreak: -1, totalTasksCompleted: -1 })
    .limit(50)
    .lean<Array<{
      _id: { toString(): string };
      username: string;
      currentStreak: number;
      bestStreak: number;
      totalTasksCompleted: number;
      totalActiveDays: number;
    }>>();

  const leaderboard = await Promise.all(
    users.map(async (user, index) => {
      const totalTasks = await Task.countDocuments({ userId: user._id });
      const completedTasks = user.totalTasksCompleted;
      const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      return {
        rank: index + 1,
        id: user._id.toString(),
        username: user.username,
        currentStreak: user.currentStreak,
        bestStreak: user.bestStreak,
        totalTasksCompleted: user.totalTasksCompleted,
        totalActiveDays: user.totalActiveDays,
        completionPercentage: completionPct,
      };
    })
  );

  return NextResponse.json({ leaderboard });
}
