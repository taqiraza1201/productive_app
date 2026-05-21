import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Task } from "@/models/Task";
import { CheckIn } from "@/models/CheckIn";
import { getDateStr, getDailyCheckInStatus, getDisciplineMetrics, getSundayReviewStatus, PRESSURE_MESSAGES } from "@/lib/discipline";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const user = await User.findById(session.user.id).lean<{
    _id: { toString(): string };
    username: string;
    email: string;
    isDisabled: boolean;
    currentStreak: number;
    bestStreak: number;
    totalTasksCompleted: number;
    totalActiveDays: number;
    lastActiveDate: Date | null;
    createdAt: Date;
  }>();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.isDisabled) return NextResponse.json({ error: "Account is disabled." }, { status: 403 });

  const todayStr = getDateStr();
  const todayTasks = await Task.find({ userId: session.user.id, taskDate: todayStr }).lean();
  const [disciplineMetrics, checkInStatus, reviewStatus, stuckReasonAggregation, todayCheckIn] = await Promise.all([
    getDisciplineMetrics(session.user.id),
    getDailyCheckInStatus(session.user.id),
    getSundayReviewStatus(session.user.id),
    Task.aggregate<{ _id: string; count: number }>([
      { $match: { userId: user._id, status: "STUCK" } },
      { $group: { _id: "$stuckReason", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    CheckIn.findOne({ userId: session.user.id, date: todayStr }).lean(),
  ]);

  const pressureMessage = PRESSURE_MESSAGES[Math.floor(Math.random() * PRESSURE_MESSAGES.length)];

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
    todayTasks,
    completedTasks: disciplineMetrics.completedTasks,
    stuckTasks: disciplineMetrics.stuckTasks,
    stuckRatio: disciplineMetrics.stuckRatio,
    totalStudyHours: disciplineMetrics.totalStudyHours,
    weeklyConsistencyPercent: disciplineMetrics.weeklyConsistencyPercent,
    missedDaysThisMonth: disciplineMetrics.missedDaysThisMonth,
    lastSkippedDay: disciplineMetrics.lastSkippedDay,
    estimatedLostStudyHours: disciplineMetrics.estimatedLostStudyHours,
    stuckReasonFrequency: stuckReasonAggregation,
    pressureMessage,
    checkInStatus,
    reviewStatus,
    todayCheckIn,
    locked: !checkInStatus.hasCheckIn,
  });
}
