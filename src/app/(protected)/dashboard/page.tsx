"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface DashboardData {
  user: {
    username: string;
    currentStreak: number;
    bestStreak: number;
    totalTasksCompleted: number;
    totalActiveDays: number;
    lastActiveDate: string | null;
  };
  ranking: { rank: number; total: number };
  completionPercentage: number;
  completedTasks: number;
  stuckTasks: number;
  todayTasks: Array<{ _id: string; title: string; completed: boolean; status?: "PENDING" | "DONE" | "STUCK" }>;
}

interface Activity {
  id: string;
  username: string;
  action: string;
  type: "DONE" | "STUCK";
  taskTitle: string;
  note: string;
  createdAt: string;
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`bg-gray-900 border ${color} rounded-xl p-5`}>
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashRes, actRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/activity"),
      ]);
      if (!dashRes.ok) throw new Error("Failed to load dashboard");
      const dashData = await dashRes.json();
      setData(dashData);
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivity(actData.activity ?? []);
      }
    } catch {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial async fetch for dashboard data
    void fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => {
      clearInterval(interval);
    };
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { user, ranking, completionPercentage, todayTasks, completedTasks, stuckTasks } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, <span className="text-cyan-400">{user.username}</span> 👋
        </h1>
        <p className="text-gray-400 mt-1">Here&apos;s your consistency overview.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
        <StatCard label="Current Streak" value={`🔥 ${user.currentStreak}`} sub="days" color="border-orange-500/30" />
        <StatCard label="Best Streak" value={`⚡ ${user.bestStreak}`} sub="days" color="border-yellow-500/30" />
        <StatCard label="Active Days" value={user.totalActiveDays} sub="total" color="border-cyan-500/30" />
        <StatCard label="Tasks Done" value={completedTasks} sub="completed" color="border-green-500/30" />
        <StatCard label="Tasks Stuck" value={stuckTasks} sub="needs attention" color="border-red-500/30" />
        <StatCard label="Completion" value={`${completionPercentage}%`} sub="rate" color="border-purple-500/30" />
        <StatCard label="Rank" value={`#${ranking.rank}`} sub={`of ${ranking.total}`} color="border-pink-500/30" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">Today&apos;s Tasks</h2>
          {todayTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">No tasks today. Create one between 10 PM - 12 AM.</p>
          ) : (
            <ul className="space-y-2">
              {todayTasks.map((task) => (
                <li key={task._id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                  <span className={`w-2 h-2 rounded-full ${(task.status ?? (task.completed ? "DONE" : "PENDING")) === "DONE" ? "bg-green-400" : (task.status ?? (task.completed ? "DONE" : "PENDING")) === "STUCK" ? "bg-red-400" : "bg-gray-600"}`} />
                  <span className={`text-sm flex-1 ${(task.status ?? (task.completed ? "DONE" : "PENDING")) === "PENDING" ? "text-gray-200" : "text-gray-500"}`}>
                    {task.title}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${(task.status ?? (task.completed ? "DONE" : "PENDING")) === "DONE" ? "bg-green-500/20 text-green-400" : (task.status ?? (task.completed ? "DONE" : "PENDING")) === "STUCK" ? "bg-red-500/20 text-red-300" : "bg-gray-700 text-gray-400"}`}>
                    {task.status ?? (task.completed ? "DONE" : "PENDING")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">Recent Activity</h2>
          {activity.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {activity.slice(0, 8).map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-cyan-400">{item.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-300">
                      <span className="font-medium text-white">{item.username}</span>{" "}
                      {item.action} — <span className="text-cyan-300">{item.taskTitle}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
