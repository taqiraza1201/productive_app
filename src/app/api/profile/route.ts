import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Task } from "@/models/Task";

const updateSchema = z.object({
  username: z.string().min(2).max(50),
});

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

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const totalTasks = await Task.countDocuments({ userId: session.user.id });
  const completionPct = totalTasks > 0 ? Math.round((user.totalTasksCompleted / totalTasks) * 100) : 0;

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
      completionPercentage: completionPct,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid username" }, { status: 400 });

  await connectDB();
  const user = await User.findByIdAndUpdate(
    session.user.id,
    { username: parsed.data.username.trim() },
    { new: true }
  ).lean();

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ message: "Profile updated" });
}
