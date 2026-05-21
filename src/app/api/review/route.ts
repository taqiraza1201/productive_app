import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { WeeklyReview } from "@/models/WeeklyReview";
import { getCurrentWeekStart } from "@/lib/discipline";

const reviewSchema = z.object({
  improved: z.string().trim().min(3).max(3000),
  biggestConfusion: z.string().trim().min(3).max(3000),
  biggestDistraction: z.string().trim().min(3).max(3000),
  wastedMostTime: z.string().trim().min(3).max(3000),
  nextWeekTarget: z.string().trim().min(3).max(3000),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const reviews = await WeeklyReview.find({ userId: session.user.id }).sort({ weekStartDate: -1 }).limit(20).lean();
  const isSunday = new Date().getDay() === 0;
  const weekStartDate = getCurrentWeekStart();
  const currentWeekReview = await WeeklyReview.findOne({ userId: session.user.id, weekStartDate }).lean();

  return NextResponse.json({ isSunday, weekStartDate, currentWeekReview, reviews });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (new Date().getDay() !== 0) {
    return NextResponse.json({ error: "Weekly review submissions are only allowed on Sundays." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid review." }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById(session.user.id).select("isDisabled").lean<{ isDisabled: boolean } | null>();
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (user.isDisabled) return NextResponse.json({ error: "Account is disabled." }, { status: 403 });

  const weekStartDate = getCurrentWeekStart();
  const review = await WeeklyReview.findOneAndUpdate(
    { userId: session.user.id, weekStartDate },
    { userId: session.user.id, weekStartDate, ...parsed.data },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return NextResponse.json({ review });
}
