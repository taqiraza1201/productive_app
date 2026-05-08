"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";

interface Task {
  _id: string;
  title: string;
  description: string;
  completed: boolean;
  taskDate: string;
  createdAt: string;
}

function isTaskWindowOpen(): boolean {
  const hour = new Date().getHours();
  return hour >= 22;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [windowOpen, setWindowOpen] = useState(isTaskWindowOpen());

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    setLoading(true);
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const interval = setInterval(() => {
      setWindowOpen(isTaskWindowOpen());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setError("");
    setSuccess("");
    setCreating(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create task.");
        return;
      }
      setTitle("");
      setDescription("");
      setSuccess("Task created!");
      await fetchTasks();
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("An error occurred.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleTask(id: string, completed: boolean) {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !completed }),
      });
      if (res.ok) {
        setTasks((prev) => prev.map((t) => t._id === id ? { ...t, completed: !completed } : t));
      }
    } catch {
      // ignore
    }
  }

  async function deleteTask(id: string) {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) setTasks((prev) => prev.filter((t) => t._id !== id));
    } catch {
      // ignore
    }
  }

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Daily Tasks</h1>
        <p className="text-gray-400 mt-1">Track your cybersecurity challenges.</p>
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400">Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          max={format(new Date(), "yyyy-MM-dd")}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Create task form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Create Task</h2>
          <span className={`text-xs px-2 py-1 rounded-full ${windowOpen ? "bg-green-500/20 text-green-400" : "bg-gray-800 text-gray-500"}`}>
            {windowOpen ? "Window Open (10 PM - 12 AM)" : "Window Closed"}
          </span>
        </div>

        {!windowOpen && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
            ⏰ Task creation is only allowed between 10:00 PM and 12:00 AM.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">{success}</div>
        )}

        <form onSubmit={handleCreate} className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title..."
            disabled={!windowOpen || creating}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)..."
            disabled={!windowOpen || creating}
            rows={2}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!windowOpen || creating || !title.trim()}
            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {creating ? "Creating..." : "Add Task"}
          </button>
        </form>
      </div>

      {/* Task list */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">
            {selectedDate === format(new Date(), "yyyy-MM-dd") ? "Today's Tasks" : `Tasks for ${selectedDate}`}
          </h2>
          {tasks.length > 0 && (
            <span className="text-xs text-gray-400">{completedCount}/{tasks.length} done</span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No tasks for this date.</p>
        ) : (
          <ul className="space-y-3">
            {tasks.map((task) => (
              <li key={task._id} className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg group">
                <button
                  onClick={() => toggleTask(task._id, task.completed)}
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    task.completed ? "bg-green-500 border-green-500" : "border-gray-600 hover:border-cyan-500"
                  }`}
                >
                  {task.completed && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.completed ? "line-through text-gray-500" : "text-white"}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
                  )}
                </div>
                <button
                  onClick={() => deleteTask(task._id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-red-400 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
