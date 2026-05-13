"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin";
  isPublic: boolean;
  isDisabled: boolean;
  currentStreak: number;
  stats: {
    totalTasks: number;
    doneTasks: number;
    stuckTasks: number;
  };
}

interface AdminTask {
  id: string;
  title: string;
  status: "PENDING" | "DONE" | "STUCK";
  doneNote: string;
  stuckNote: string;
  taskDate: string;
  user: { id: string; username: string; email: string };
}

interface AdminActivity {
  id: string;
  type: "DONE" | "STUCK";
  taskTitle: string;
  note: string;
  isHidden: boolean;
  createdAt: string;
  user: { id: string; username: string; email: string };
}

export default function AdminPanel() {
  const [query, setQuery] = useState("");
  const [taskUserId, setTaskUserId] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [taskStatus, setTaskStatus] = useState<"" | "PENDING" | "DONE" | "STUCK">("");
  const [activityType, setActivityType] = useState<"" | "DONE" | "STUCK">("");
  const [activityHidden, setActivityHidden] = useState<"" | "true" | "false">("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadUsers() {
    const res = await fetch(`/api/admin/users${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    if (!res.ok) return;
    const data = await res.json();
    setUsers(data.users ?? []);
  }

  async function loadTasks() {
    const params = new URLSearchParams();
    if (taskUserId.trim()) params.set("userId", taskUserId.trim());
    if (taskDate) params.set("date", taskDate);
    if (taskStatus) params.set("status", taskStatus);
    const res = await fetch(`/api/admin/tasks${params.toString() ? `?${params.toString()}` : ""}`);
    if (!res.ok) return;
    const data = await res.json();
    setTasks(data.tasks ?? []);
  }

  async function loadActivities() {
    const params = new URLSearchParams();
    if (activityType) params.set("type", activityType);
    if (activityHidden) params.set("hidden", activityHidden);
    const res = await fetch(`/api/admin/activity${params.toString() ? `?${params.toString()}` : ""}`);
    if (!res.ok) return;
    const data = await res.json();
    setActivities(data.activities ?? []);
  }

  async function refreshAll() {
    setLoading(true);
    await Promise.all([loadUsers(), loadTasks(), loadActivities()]);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial async admin data load
    void refreshAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateUser(action: "setPublic" | "setDisabled" | "resetStreak", userId: string, value?: boolean) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, value }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Failed to update user.");
      return;
    }
    setMessage("User updated.");
    await Promise.all([loadUsers(), loadTasks(), loadActivities()]);
  }

  async function moderateActivity(activityId: string, hidden: boolean) {
    const res = await fetch("/api/admin/activity", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityId, hidden }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Failed to moderate activity.");
      return;
    }
    setMessage(hidden ? "Activity hidden." : "Activity restored.");
    await loadActivities();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        <p className="text-gray-400 mt-1">Manage users, tasks, and activity.</p>
      </div>

      {message && <p className="text-sm text-cyan-300">{message}</p>}

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <>
          <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-white">Users</h2>
              <div className="flex gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search users"
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
                />
                <button
                  onClick={() => void loadUsers()}
                  className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm text-white"
                >
                  Search
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="bg-gray-800 rounded-lg p-3 text-sm">
                  <p className="text-white font-medium">{user.username} <span className="text-gray-400">({user.email})</span></p>
                  <p className="text-gray-400 mt-1">
                    Role: {user.role} • Public: {user.isPublic ? "Yes" : "No"} • Disabled: {user.isDisabled ? "Yes" : "No"} • Streak: {user.currentStreak}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Tasks: {user.stats.totalTasks} • Done: {user.stats.doneTasks} • Stuck: {user.stats.stuckTasks}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button onClick={() => void updateUser("setPublic", user.id, !user.isPublic)} className="px-2 py-1 rounded bg-gray-700 text-gray-200">
                      Set {user.isPublic ? "Private" : "Public"}
                    </button>
                    <button onClick={() => void updateUser("resetStreak", user.id)} className="px-2 py-1 rounded bg-yellow-600/30 text-yellow-300">
                      Reset streak
                    </button>
                    <button onClick={() => void updateUser("setDisabled", user.id, !user.isDisabled)} className="px-2 py-1 rounded bg-red-600/30 text-red-300">
                      {user.isDisabled ? "Enable" : "Disable"}
                    </button>
                    <button onClick={() => setTaskUserId(user.id)} className="px-2 py-1 rounded bg-cyan-600/30 text-cyan-200">
                      Filter tasks by user
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="font-semibold text-white">Tasks</h2>
              <div className="flex flex-wrap gap-2">
                <input
                  value={taskUserId}
                  onChange={(e) => setTaskUserId(e.target.value)}
                  placeholder="User ID"
                  className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white"
                />
                <input
                  type="date"
                  value={taskDate}
                  onChange={(e) => setTaskDate(e.target.value)}
                  className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white"
                />
                <select
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value as "" | "PENDING" | "DONE" | "STUCK")}
                  className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white"
                >
                  <option value="">All statuses</option>
                  <option value="PENDING">PENDING</option>
                  <option value="DONE">DONE</option>
                  <option value="STUCK">STUCK</option>
                </select>
                <button onClick={() => void loadTasks()} className="px-2 py-1 rounded bg-cyan-600 text-white text-xs">
                  Apply
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-80 overflow-auto">
              {tasks.map((task) => (
                <div key={task.id} className="bg-gray-800 rounded-lg p-3 text-sm">
                  <p className="text-white">{task.title} <span className="text-gray-500">({task.taskDate})</span></p>
                  <p className="text-gray-400">By {task.user.username} • {task.status}</p>
                  {task.doneNote && <p className="text-green-300 text-xs mt-1">Learned: {task.doneNote}</p>}
                  {task.stuckNote && <p className="text-red-300 text-xs mt-1">Reason: {task.stuckNote}</p>}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="font-semibold text-white">Activity Moderation</h2>
              <div className="flex flex-wrap gap-2">
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value as "" | "DONE" | "STUCK")}
                  className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white"
                >
                  <option value="">All types</option>
                  <option value="DONE">DONE</option>
                  <option value="STUCK">STUCK</option>
                </select>
                <select
                  value={activityHidden}
                  onChange={(e) => setActivityHidden(e.target.value as "" | "true" | "false")}
                  className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white"
                >
                  <option value="">All visibility</option>
                  <option value="false">Visible</option>
                  <option value="true">Hidden</option>
                </select>
                <button onClick={() => void loadActivities()} className="px-2 py-1 rounded bg-cyan-600 text-white text-xs">
                  Apply
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-80 overflow-auto">
              {activities.map((item) => (
                <div key={item.id} className="bg-gray-800 rounded-lg p-3 text-sm">
                  <p className="text-white">
                    {item.user.username} {item.type === "DONE" ? "completed" : "stuck on"} {item.taskTitle}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">{item.note}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-gray-500 text-xs">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</p>
                    <button
                      onClick={() => void moderateActivity(item.id, !item.isHidden)}
                      className="px-2 py-1 rounded bg-gray-700 text-gray-200"
                    >
                      {item.isHidden ? "Unhide" : "Hide"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
