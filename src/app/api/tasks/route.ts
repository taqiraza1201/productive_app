import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Task } from "@/models/Task";
import { User } from "@/models/User";
import { isTaskCreationAllowed, getTaskWindowMessage } from "@/lib/taskWindow";
import { getTodayDateStr } from "@/lib/streak";
import { getDailyCheckInStatus } from "@/lib/discipline";

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? getTodayDateStr();

  await connectDB();
  const currentUser = await User.findById(session.user.id).select("isDisabled").lean<{ isDisabled: boolean } | null>();
  if (currentUser?.isDisabled) return NextResponse.json({ error: "Account is disabled." }, { status: 403 });
  const checkInStatus = await getDailyCheckInStatus(session.user.id);
  if (!checkInStatus.hasCheckIn) {
    return NextResponse.json({ error: "Daily check-in required before accessing tasks.", lockTo: "/check-in" }, { status: 423 });
  }
  const tasks = await Task.find({ userId: session.user.id, taskDate: date }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isTaskCreationAllowed()) {
    return NextResponse.json({ error: getTaskWindowMessage() }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { title, description } = parsed.data;
  const todayStr = getTodayDateStr();

  await connectDB();
  const currentUser = await User.findById(session.user.id).select("isDisabled").lean<{ isDisabled: boolean } | null>();
  if (currentUser?.isDisabled) return NextResponse.json({ error: "Account is disabled." }, { status: 403 });
  const checkInStatus = await getDailyCheckInStatus(session.user.id);
  if (!checkInStatus.hasCheckIn) {
    return NextResponse.json({ error: "Daily check-in required before creating tasks.", lockTo: "/check-in" }, { status: 423 });
  }

  const task = await Task.create({
    title,
    description,
    userId: session.user.id,
    taskDate: todayStr,
    status: "PENDING",
    doneNote: "",
    stuckNote: "",
    doneWhatLearned: "",
    doneWhatCompleted: "",
    doneEvidenceType: "notes",
    doneEvidenceText: "",
    stuckReason: "",
    stuckExplanation: "",
  });

  return NextResponse.json({ task }, { status: 201 });
}
