import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Task } from "@/models/Task";
import { User } from "@/models/User";

export async function GET() {
  await connectDB();

  const recentTasks = await Task.find({})
    .sort({ createdAt: -1 })
    .limit(20)
    .lean<Array<{
      _id: { toString(): string };
      title: string;
      completed: boolean;
      userId: { toString(): string };
      createdAt: Date;
    }>>();

  const userIds = [...new Set(recentTasks.map((t) => t.userId.toString()))];
  const users = await User.find({ _id: { $in: userIds } }).select("username").lean<Array<{
    _id: { toString(): string };
    username: string;
  }>>();

  const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u.username]));

  const activity = recentTasks.map((task) => ({
    id: task._id.toString(),
    username: userMap[task.userId.toString()] ?? "Unknown",
    action: task.completed ? "completed a task" : "created a task",
    taskTitle: task.title,
    createdAt: task.createdAt,
  }));

  return NextResponse.json({ activity });
}
