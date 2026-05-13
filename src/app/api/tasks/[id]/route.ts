import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Task } from "@/models/Task";
import { User } from "@/models/User";
import { calculateStreak, getTodayDateStr } from "@/lib/streak";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  await connectDB();
  const task = await Task.findOne({ _id: id, userId: session.user.id });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const wasCompleted = task.completed;
  task.completed = body.completed ?? !task.completed;
  await task.save();

  // Update stats if completing
  if (!wasCompleted && task.completed) {
    const user = await User.findById(session.user.id);
    if (user) {
      const todayStr = getTodayDateStr();
      const updated = calculateStreak({
        currentStreak: user.currentStreak,
        bestStreak: user.bestStreak,
        totalActiveDays: user.totalActiveDays,
        lastActiveDate: user.lastActiveDate,
        todayStr,
      });
      await User.findByIdAndUpdate(session.user.id, {
        ...updated,
        totalTasksCompleted: user.totalTasksCompleted + 1,
        lastActiveDate: new Date(),
      });
    }
  } else if (wasCompleted && !task.completed) {
    await User.findByIdAndUpdate(session.user.id, {
      $inc: { totalTasksCompleted: -1 },
    });
  }

  return NextResponse.json({ task });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await connectDB();
  const task = await Task.findOneAndDelete({ _id: id, userId: session.user.id });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  return NextResponse.json({ message: "Deleted" });
}
