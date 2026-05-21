import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Task } from "@/models/Task";
import { User } from "@/models/User";
import { getDailyCheckInStatus } from "@/lib/discipline";

const donePayloadSchema = z.object({
  status: z.literal("DONE"),
  whatLearned: z.string().trim().min(5).max(2000),
  whatCompleted: z.string().trim().min(5).max(2000),
  evidenceType: z.enum(["notes", "commands", "code_snippet", "writeup"]),
  evidenceText: z.string().trim().min(5).max(5000),
});

const stuckPayloadSchema = z.object({
  status: z.literal("STUCK"),
  reason: z.enum(["procrastination", "distraction", "confusion", "burnout", "fear_of_difficulty", "poor_planning", "tiredness", "other"]),
  explanation: z.string().trim().min(5).max(2000),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  await connectDB();
  const currentUser = await User.findById(session.user.id).select("isDisabled").lean<{ isDisabled: boolean } | null>();
  if (currentUser?.isDisabled) return NextResponse.json({ error: "Account is disabled." }, { status: 403 });
  const checkInStatus = await getDailyCheckInStatus(session.user.id);
  if (!checkInStatus.hasCheckIn) {
    return NextResponse.json({ error: "Daily check-in required before updating tasks.", lockTo: "/check-in" }, { status: 423 });
  }

  const task = await Task.findOne({ _id: id, userId: session.user.id });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const currentStatus =
    task.status ??
    (task.completed ? "DONE" : "PENDING");

  if (currentStatus !== "PENDING") {
    return NextResponse.json({ error: "Task already finalized." }, { status: 400 });
  }

  if (body?.status === "DONE") {
    const parsedDone = donePayloadSchema.safeParse(body);
    if (!parsedDone.success) {
      return NextResponse.json({ error: parsedDone.error.issues[0]?.message ?? "DONE evidence is required." }, { status: 400 });
    }
    const { whatLearned, whatCompleted, evidenceType, evidenceText } = parsedDone.data;
    task.status = "DONE";
    task.completed = true;
    task.doneWhatLearned = whatLearned;
    task.doneWhatCompleted = whatCompleted;
    task.doneEvidenceType = evidenceType;
    task.doneEvidenceText = evidenceText;
    task.doneNote = `${whatLearned}\n${whatCompleted}\n${evidenceText}`;
    task.stuckNote = "";
    task.stuckReason = "";
    task.stuckExplanation = "";
  } else if (body?.status === "STUCK") {
    const parsedStuck = stuckPayloadSchema.safeParse(body);
    if (!parsedStuck.success) {
      return NextResponse.json({ error: parsedStuck.error.issues[0]?.message ?? "STUCK reason and explanation are required." }, { status: 400 });
    }
    const { reason, explanation } = parsedStuck.data;
    task.status = "STUCK";
    task.completed = false;
    task.stuckReason = reason;
    task.stuckExplanation = explanation;
    task.stuckNote = explanation;
    task.doneNote = "";
    task.doneWhatLearned = "";
    task.doneWhatCompleted = "";
    task.doneEvidenceType = "notes";
    task.doneEvidenceText = "";
  } else {
    return NextResponse.json({ error: "Invalid status update." }, { status: 400 });
  }

  task.statusUpdatedAt = new Date();
  await task.save();
  if (task.status === "DONE") {
    await User.findByIdAndUpdate(session.user.id, { $inc: { totalTasksCompleted: 1 } });
  }

  return NextResponse.json({ task });
}

export async function DELETE() {
  return NextResponse.json({ error: "Task deletion is disabled." }, { status: 405 });
}
