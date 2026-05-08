import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Task } from "@/models/Task";
import { format, subDays, eachDayOfInterval } from "date-fns";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const userId = session.user.id;

  // Weekly - last 7 days
  const today = new Date();
  const weekStart = subDays(today, 6);
  const weekDays = eachDayOfInterval({ start: weekStart, end: today });

  const weeklyTasks = await Task.find({
    userId,
    taskDate: { $in: weekDays.map((d) => format(d, "yyyy-MM-dd")) },
  }).lean<Array<{ taskDate: string; completed: boolean }>>();

  const weeklyData = weekDays.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayTasks = weeklyTasks.filter((t) => t.taskDate === dayStr);
    return {
      date: format(day, "MMM dd"),
      total: dayTasks.length,
      completed: dayTasks.filter((t) => t.completed).length,
    };
  });

  // Monthly - last 30 days
  const monthStart = subDays(today, 29);
  const monthDays = eachDayOfInterval({ start: monthStart, end: today });

  const monthlyTasks = await Task.find({
    userId,
    taskDate: { $in: monthDays.map((d) => format(d, "yyyy-MM-dd")) },
  }).lean<Array<{ taskDate: string; completed: boolean }>>();

  const monthlyData = monthDays.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayTasks = monthlyTasks.filter((t) => t.taskDate === dayStr);
    return {
      date: format(day, "MMM dd"),
      total: dayTasks.length,
      completed: dayTasks.filter((t) => t.completed).length,
    };
  });

  return NextResponse.json({ weeklyData, monthlyData });
}
