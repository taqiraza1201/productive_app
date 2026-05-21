"use client";

import { useEffect, useState } from "react";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin";
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

export default function AdminPanel() {
  const [query, setQuery] = useState("");
  const [taskUserId, setTaskUserId] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [taskStatus, setTaskStatus] = useState<"" | "PENDING" | "DONE" | "STUCK">("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tasks, setTasks] = useState<AdminTask[]>([]);
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

  async function refreshAll() {
    setLoading(true);
    await Promise.all([loadUsers(), loadTasks()]);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial async admin data load
    void refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateUser(action: "setDisabled" | "resetStreak", userId: string, value?: boolean) {
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
    await Promise.all([loadUsers(), loadTasks()]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        <p className="text-gray-400 mt-1">Manage users and tasks.</p>
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
                <button onClick={() => void loadUsers()} className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm text-white">
                  Search
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="bg-gray-800 rounded-lg p-3 text-sm">
                  <p className="text-white font-medium">{user.username} <span className="text-gray-400">({user.email})</span></p>
                  <p className="text-gray-400 mt-1">
                    Role: {user.role} • Disabled: {user.isDisabled ? "Yes" : "No"} • Streak: {user.currentStreak}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Tasks: {user.stats.totalTasks} • Done: {user.stats.doneTasks} • Stuck: {user.stats.stuckTasks}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
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
                  {task.doneNote && <p className="text-green-300 text-xs mt-1">DONE: {task.doneNote}</p>}
                  {task.stuckNote && <p className="text-red-300 text-xs mt-1">STUCK: {task.stuckNote}</p>}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
