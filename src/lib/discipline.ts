import { format, startOfMonth, subDays } from "date-fns";
import { Task } from "@/models/Task";
import { CheckIn } from "@/models/CheckIn";
import { WeeklyReview } from "@/models/WeeklyReview";

export const PRESSURE_MESSAGES = [
  "Roadmaps do not change lives. Daily execution does.",
  "You already built the system. Now execute.",
  "Consistency beats motivation.",
  "You are either compounding skills or wasting time.",
];
// Conservative baseline used for regret estimation when actual missed-day study targets are unknown.
const ASSUMED_DAILY_STUDY_HOURS = 3;

export function getDateStr(date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}

export function getCurrentWeekStart(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = (day + 6) % 7;
  d.setDate(d.getDate() - diffToMonday);
  return getDateStr(d);
}

export async function getDailyCheckInStatus(userId: string) {
  const today = getDateStr();
  const checkIn = await CheckIn.findOne({ userId, date: today }).select("_id").lean();
  return { today, hasCheckIn: Boolean(checkIn) };
}

export async function getSundayReviewStatus(userId: string) {
  const isSunday = new Date().getDay() === 0;
  if (!isSunday) return { isSunday: false, hasReview: true };
  const weekStartDate = getCurrentWeekStart();
  const review = await WeeklyReview.findOne({ userId, weekStartDate }).select("_id").lean();
  return { isSunday: true, hasReview: Boolean(review), weekStartDate };
}

export async function getDisciplineMetrics(userId: string) {
  const totalTasks = await Task.countDocuments({ userId });
  const completedTasks = await Task.countDocuments({ userId, status: "DONE" });
  const stuckTasks = await Task.countDocuments({ userId, status: "STUCK" });
  const stuckRatio = totalTasks > 0 ? Number(((stuckTasks / totalTasks) * 100).toFixed(1)) : 0;

  const checkIns = await CheckIn.find({ userId })
    .select("date studyMinutes")
    .sort({ date: -1 })
    .lean<Array<{ date: string; studyMinutes: number }>>();

  const totalStudyMinutes = checkIns.reduce((sum, item) => sum + (item.studyMinutes || 0), 0);
  const totalStudyHours = Number((totalStudyMinutes / 60).toFixed(1));

  const last7Days = Array.from({ length: 7 }, (_, i) => getDateStr(subDays(new Date(), i)));
  const checkInDates = new Set(checkIns.map((c) => c.date));
  const weeklyConsistencyPercent = Math.round((last7Days.filter((d) => checkInDates.has(d)).length / 7) * 100);

  const monthStart = startOfMonth(new Date());
  const monthStartStr = getDateStr(monthStart);
  const daysElapsedThisMonth = new Date().getDate();
  const monthlyCheckInCount = checkIns.filter((c) => c.date >= monthStartStr).length;
  const missedDaysThisMonth = Math.max(daysElapsedThisMonth - monthlyCheckInCount, 0);

  let lastSkippedDay: string | null = null;
  for (let i = 0; i < 120; i += 1) {
    const date = getDateStr(subDays(new Date(), i));
    if (!checkInDates.has(date)) {
      lastSkippedDay = date;
      break;
    }
  }

  const estimatedLostStudyHours = missedDaysThisMonth * ASSUMED_DAILY_STUDY_HOURS;

  return {
    completedTasks,
    stuckTasks,
    stuckRatio,
    totalStudyHours,
    weeklyConsistencyPercent,
    missedDaysThisMonth,
    lastSkippedDay,
    estimatedLostStudyHours,
  };
}
