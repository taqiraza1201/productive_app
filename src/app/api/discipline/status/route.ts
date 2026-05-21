import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getDailyCheckInStatus, getSundayReviewStatus } from "@/lib/discipline";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const [checkInStatus, reviewStatus] = await Promise.all([
    getDailyCheckInStatus(session.user.id),
    getSundayReviewStatus(session.user.id),
  ]);

  return NextResponse.json({
    checkInStatus,
    reviewStatus,
    locked: !checkInStatus.hasCheckIn,
    lockTo: "/check-in",
  });
}
