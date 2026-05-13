import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Task } from "@/models/Task";
import { User } from "@/models/User";
import { calculateStreak, getTodayDateStr } from "@/lib/streak";
import { Activity } from "@/models/Activity";

const updateTaskStatusSchema = z.object({
  status: z.enum(["DONE", "STUCK"]),
  note: z.string().trim().min(5).max(2000),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = updateTaskStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid status update." }, { status: 400 });
  }
  const { status, note } = parsed.data;

  await connectDB();
  const currentUser = await User.findById(session.user.id).select("isDisabled").lean<{ isDisabled: boolean } | null>();
  if (currentUser?.isDisabled) return NextResponse.json({ error: "Account is disabled." }, { status: 403 });

  const task = await Task.findOne({ _id: id, userId: session.user.id });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const currentStatus =
    task.status ??
    (task.completed ? "DONE" : "PENDING");

  if (currentStatus !== "PENDING") {
    return NextResponse.json({ error: "Task already finalized." }, { status: 400 });
  }

  task.status = status;
  task.completed = status === "DONE";
  task.statusUpdatedAt = new Date();
  task.doneNote = status === "DONE" ? note : "";
  task.stuckNote = status === "STUCK" ? note : "";
  await task.save();

  if (status === "DONE") {
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
  }

  await Activity.create({
    userId: session.user.id,
    taskId: task._id,
    type: status,
    taskTitle: task.title,
    note,
  });

  return NextResponse.json({ task });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  void req;
  void params;
  return NextResponse.json({ error: "Task deletion is disabled." }, { status: 405 });
}
