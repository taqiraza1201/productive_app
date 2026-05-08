import { format, subDays, parseISO, differenceInCalendarDays } from "date-fns";

export function getTodayDateStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function getYesterdayDateStr(): string {
  return format(subDays(new Date(), 1), "yyyy-MM-dd");
}

/**
 * Calculate updated streak values given the user's current state and the date they are active today.
 */
export function calculateStreak(params: {
  currentStreak: number;
  bestStreak: number;
  totalActiveDays: number;
  lastActiveDate: Date | null;
  todayStr: string;
}): { currentStreak: number; bestStreak: number; totalActiveDays: number } {
  const { currentStreak, bestStreak, totalActiveDays, lastActiveDate, todayStr } = params;

  const todayDate = parseISO(todayStr);

  // Already active today - no change needed
  if (lastActiveDate) {
    const lastStr = format(lastActiveDate, "yyyy-MM-dd");
    if (lastStr === todayStr) {
      return { currentStreak, bestStreak, totalActiveDays };
    }
  }

  let newStreak = currentStreak;
  let newActiveDays = totalActiveDays;

  if (lastActiveDate) {
    const lastDate = parseISO(format(lastActiveDate, "yyyy-MM-dd"));
    const diff = differenceInCalendarDays(todayDate, lastDate);
    if (diff === 1) {
      // Consecutive day
      newStreak = currentStreak + 1;
    } else {
      // Missed one or more days
      newStreak = 1;
    }
  } else {
    newStreak = 1;
  }

  newActiveDays = totalActiveDays + 1;
  const newBestStreak = Math.max(bestStreak, newStreak);

  return { currentStreak: newStreak, bestStreak: newBestStreak, totalActiveDays: newActiveDays };
}
