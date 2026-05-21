import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Task } from "@/models/Task";
import { CheckIn } from "@/models/CheckIn";
import { WeeklyReview } from "@/models/WeeklyReview";

type TimelineEvent = {
  id: string;
  type: "DONE" | "STUCK" | "CHECK_IN" | "WEEKLY_REVIEW";
  createdAt: Date;
  title: string;
  detail: string;
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const [tasks, checkIns, reviews] = await Promise.all([
    Task.find({ userId: session.user.id, status: { $in: ["DONE", "STUCK"] } })
      .sort({ statusUpdatedAt: -1 })
      .limit(200)
      .lean(),
    CheckIn.find({ userId: session.user.id }).sort({ createdAt: -1 }).limit(200).lean(),
    WeeklyReview.find({ userId: session.user.id }).sort({ createdAt: -1 }).limit(200).lean(),
  ]);

  const taskEvents: TimelineEvent[] = tasks.map((task) => {
    if (task.status === "DONE") {
      return {
        id: task._id.toString(),
        type: "DONE",
        createdAt: task.statusUpdatedAt || task.updatedAt || task.createdAt,
        title: task.title,
        detail: `Learned: ${task.doneWhatLearned ?? ""}\nCompleted: ${task.doneWhatCompleted ?? ""}\nEvidence (${task.doneEvidenceType ?? "notes"}): ${task.doneEvidenceText ?? ""}`,
      };
    }
    return {
      id: task._id.toString(),
      type: "STUCK",
      createdAt: task.statusUpdatedAt || task.updatedAt || task.createdAt,
      title: task.title,
      detail: `Reason: ${task.stuckReason || "other"}\nExplanation: ${task.stuckExplanation || task.stuckNote || ""}`,
    };
  });

  const checkInEvents: TimelineEvent[] = checkIns.map((item) => ({
    id: item._id.toString(),
    type: "CHECK_IN",
    createdAt: item.createdAt,
    title: `Daily Check-in (${item.date})`,
    detail: `Study: ${item.studyMinutes} min\nStudied: ${item.studied}\nConfusion: ${item.biggestConfusion}\nTomorrow: ${item.tomorrowTarget}${item.noZeroDaySaved ? `\nRecovery: ${item.recoveryTask}` : ""}`,
  }));

  const reviewEvents: TimelineEvent[] = reviews.map((item) => ({
    id: item._id.toString(),
    type: "WEEKLY_REVIEW",
    createdAt: item.createdAt,
    title: `Weekly Review (${item.weekStartDate})`,
    detail: `Improved: ${item.improved}\nBiggest confusion: ${item.biggestConfusion}\nBiggest distraction: ${item.biggestDistraction}\nMost wasted time: ${item.wastedMostTime}\nNext target: ${item.nextWeekTarget}`,
  }));

  const timeline = [...taskEvents, ...checkInEvents, ...reviewEvents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({ timeline });
}
