import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Task } from "@/models/Task";
import { User } from "@/models/User";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const status = searchParams.get("status");
  const date = searchParams.get("date");

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (userId) filter.userId = userId;
  if (status && ["PENDING", "DONE", "STUCK"].includes(status)) filter.status = status;
  if (date) filter.taskDate = date;

  const tasks = await Task.find(filter)
    .sort({ createdAt: -1 })
    .limit(250)
    .lean<Array<{
      _id: { toString(): string };
      title: string;
      description: string;
      taskDate: string;
      status?: "PENDING" | "DONE" | "STUCK";
      completed: boolean;
      doneWhatLearned?: string;
      doneWhatCompleted?: string;
      doneEvidenceType?: "notes" | "commands" | "code_snippet" | "writeup";
      doneEvidenceText?: string;
      stuckReason?: string;
      stuckExplanation?: string;
      doneNote?: string;
      stuckNote?: string;
      userId: { toString(): string };
      createdAt: Date;
    }>>();

  const userIds = [...new Set(tasks.map((t) => t.userId.toString()))];
  const users = await User.find({ _id: { $in: userIds } }).select("username email").lean<Array<{
    _id: { toString(): string };
    username: string;
    email: string;
  }>>();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  return NextResponse.json({
    tasks: tasks.map((task) => {
      const statusValue = task.status ?? (task.completed ? "DONE" : "PENDING");
      const user = userMap.get(task.userId.toString());
      return {
        id: task._id.toString(),
        title: task.title,
        description: task.description,
        taskDate: task.taskDate,
        status: statusValue,
        doneNote:
          task.doneWhatLearned || task.doneWhatCompleted || task.doneEvidenceText
            ? `Learned: ${task.doneWhatLearned ?? ""}\nCompleted: ${task.doneWhatCompleted ?? ""}\nEvidence (${task.doneEvidenceType ?? "notes"}): ${task.doneEvidenceText ?? ""}`.trim()
            : (task.doneNote ?? ""),
        stuckNote:
          task.stuckReason || task.stuckExplanation
            ? `${task.stuckReason ?? "other"}: ${task.stuckExplanation ?? ""}`.trim()
            : (task.stuckNote ?? ""),
        createdAt: task.createdAt,
        user: user
          ? { id: task.userId.toString(), username: user.username, email: user.email }
          : { id: task.userId.toString(), username: "Unknown", email: "" },
      };
    }),
  });
}
