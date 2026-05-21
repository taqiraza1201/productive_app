"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface DashboardData {
  user: {
    username: string;
    currentStreak: number;
    bestStreak: number;
  };
  completedTasks: number;
  stuckTasks: number;
  stuckRatio: number;
  totalStudyHours: number;
  weeklyConsistencyPercent: number;
  missedDaysThisMonth: number;
  lastSkippedDay: string | null;
  estimatedLostStudyHours: number;
  pressureMessage: string;
  stuckReasonFrequency: Array<{ _id: string; count: number }>;
  checkInStatus: { hasCheckIn: boolean; today: string };
  reviewStatus: { isSunday: boolean; hasReview: boolean };
  locked: boolean;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed");
      const dashData = await res.json();
      setData(dashData);
    } catch {
      setError("Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial async fetch for dashboard data
    void fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  if (loading) return <p className="text-gray-400">Loading...</p>;
  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Discipline Dashboard</h1>
        <p className="text-gray-400 mt-1">Execution over motivation.</p>
      </div>

      {!data.checkInStatus.hasCheckIn && (
        <div className="bg-gray-900 border border-amber-500/40 rounded-xl p-4">
          <p className="text-amber-300 text-sm">
            Daily check-in missing. System is locked until check-in is submitted.
          </p>
          <Link href="/check-in" className="inline-block mt-2 text-sm text-amber-200 underline">
            Go to check-in
          </Link>
        </div>
      )}

      {data.reviewStatus.isSunday && !data.reviewStatus.hasReview && (
        <div className="bg-gray-900 border border-cyan-500/40 rounded-xl p-4">
          <p className="text-cyan-300 text-sm">Sunday weekly review is pending.</p>
          <Link href="/review" className="inline-block mt-2 text-sm text-cyan-200 underline">
            Complete review
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard label="Current streak" value={data.user.currentStreak} sub="check-in days" />
        <StatCard label="Best streak" value={data.user.bestStreak} sub="days" />
        <StatCard label="Completed tasks" value={data.completedTasks} />
        <StatCard label="Stuck tasks" value={data.stuckTasks} />
        <StatCard label="Stuck ratio" value={`${data.stuckRatio}%`} />
        <StatCard label="Study hours" value={data.totalStudyHours} />
        <StatCard label="Weekly consistency" value={`${data.weeklyConsistencyPercent}%`} />
        <StatCard label="Missed days (month)" value={data.missedDaysThisMonth} />
        <StatCard label="Last skipped day" value={data.lastSkippedDay ?? "none"} />
        <StatCard label="Estimated lost hours" value={data.estimatedLostStudyHours} />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Reality / Pressure</p>
        <p className="text-cyan-300 text-sm">{data.pressureMessage}</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Future Regret</p>
        <p className="text-gray-300 text-sm">
          You skipped {data.missedDaysThisMonth} days this month. Estimated lost study time: {data.estimatedLostStudyHours} hours.
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">STUCK Pattern Frequency</p>
        {data.stuckReasonFrequency.length === 0 ? (
          <p className="text-gray-500 text-sm">No stuck patterns recorded yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {data.stuckReasonFrequency.map((item) => (
              <li key={item._id} className="text-gray-300">
                {item._id || "unspecified"}: <span className="text-cyan-300">{item.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
