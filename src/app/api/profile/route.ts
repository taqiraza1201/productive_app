import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Task } from "@/models/Task";

const updateSchema = z.object({
  username: z.string().min(2).max(50).optional(),
  isPublic: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const user = await User.findById(session.user.id).lean<{
    _id: { toString(): string };
    username: string;
    email: string;
    isPublic: boolean;
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
      isPublic: user.isPublic ?? true,
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
  if (!parsed.success) return NextResponse.json({ error: "Invalid profile update" }, { status: 400 });
  if (!parsed.data.username && parsed.data.isPublic === undefined) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const updateData: { username?: string; isPublic?: boolean } = {};
  if (parsed.data.username) updateData.username = parsed.data.username.trim();
  if (parsed.data.isPublic !== undefined) updateData.isPublic = parsed.data.isPublic;

  await connectDB();
  const user = await User.findByIdAndUpdate(
    session.user.id,
    updateData,
    { new: true }
  ).lean();

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ message: "Profile updated" });
}
