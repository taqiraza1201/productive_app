import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Task } from "@/models/Task";
import { CheckIn } from "@/models/CheckIn";
import { calculateStreak } from "@/lib/streak";
import { getDateStr } from "@/lib/discipline";

const checkInSchema = z.object({
  studyMinutes: z.coerce.number().int().min(0).max(1440),
  studied: z.string().trim().min(3).max(2000),
  biggestConfusion: z.string().trim().min(3).max(2000),
  tomorrowTarget: z.string().trim().min(3).max(2000),
  recoveryTask: z.enum(["revise_notes", "linux_command_practice", "packet_analysis", "focused_study_15m"]).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const today = getDateStr();
  const checkIn = await CheckIn.findOne({ userId: session.user.id, date: today }).lean();
  return NextResponse.json({ today, checkIn });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = checkInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid check-in." }, { status: 400 });
  }

  await connectDB();

  const user = await User.findById(session.user.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.isDisabled) return NextResponse.json({ error: "Account is disabled." }, { status: 403 });

  const today = getDateStr();
  const doneToday = await Task.countDocuments({ userId: session.user.id, taskDate: today, status: "DONE" });
  const needsRecovery = doneToday === 0;
  if (needsRecovery && !parsed.data.recoveryTask) {
    return NextResponse.json({ error: "No-zero-day recovery task is required when no DONE tasks exist for today." }, { status: 400 });
  }

  const payload = {
    userId: session.user.id,
    date: today,
    studyMinutes: parsed.data.studyMinutes,
    studied: parsed.data.studied,
    biggestConfusion: parsed.data.biggestConfusion,
    tomorrowTarget: parsed.data.tomorrowTarget,
    recoveryTask: parsed.data.recoveryTask ?? "",
    noZeroDaySaved: needsRecovery,
  };

  const checkIn = await CheckIn.findOneAndUpdate(
    { userId: session.user.id, date: today },
    payload,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  const updated = calculateStreak({
    currentStreak: user.currentStreak,
    bestStreak: user.bestStreak,
    totalActiveDays: user.totalActiveDays,
    lastActiveDate: user.lastActiveDate,
    todayStr: today,
  });

  await User.findByIdAndUpdate(session.user.id, {
    ...updated,
    lastActiveDate: new Date(),
  });

  return NextResponse.json({ checkIn });
}
