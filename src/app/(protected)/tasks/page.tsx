"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import CheckInLock from "@/components/CheckInLock";

interface Task {
  _id: string;
  title: string;
  description: string;
  completed: boolean;
  status?: "PENDING" | "DONE" | "STUCK";
  doneWhatLearned?: string;
  doneWhatCompleted?: string;
  doneEvidenceType?: "notes" | "commands" | "code_snippet" | "writeup";
  doneEvidenceText?: string;
  stuckReason?: string;
  stuckExplanation?: string;
  taskDate: string;
}

function isTaskWindowOpen(): boolean {
  const hour = new Date().getHours();
  return hour >= 22 && hour <= 23;
}

const stuckReasons = [
  "procrastination",
  "distraction",
  "confusion",
  "burnout",
  "fear_of_difficulty",
  "poor_planning",
  "tiredness",
  "other",
] as const;

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
  const [locked, setLocked] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeStatus, setActiveStatus] = useState<"DONE" | "STUCK" | null>(null);
  const [whatLearned, setWhatLearned] = useState("");
  const [whatCompleted, setWhatCompleted] = useState("");
  const [evidenceType, setEvidenceType] = useState<"notes" | "commands" | "code_snippet" | "writeup">("notes");
  const [evidenceText, setEvidenceText] = useState("");
  const [stuckReason, setStuckReason] = useState<typeof stuckReasons[number]>("procrastination");
  const [stuckExplanation, setStuckExplanation] = useState("");

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks?date=${selectedDate}`);
      const data = await res.json();
      if (res.status === 423) {
        setLocked(true);
        setTasks([]);
        return;
      }
      if (res.ok) {
        setLocked(false);
        setTasks(data.tasks ?? []);
      }
    } catch {
      setError("Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial async fetch for selected date tasks
    void fetchTasks();
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
    if (!window.confirm("Are you sure?\n\nTasks cannot be deleted.")) return;
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
        if (res.status === 423) setLocked(true);
        return;
      }
      setTitle("");
      setDescription("");
      setSuccess("Task created.");
      await fetchTasks();
      setTimeout(() => setSuccess(""), 2500);
    } catch {
      setError("An error occurred.");
    } finally {
      setCreating(false);
    }
  }

  function startFinalize(task: Task, status: "DONE" | "STUCK") {
    setError("");
    setActiveTask(task);
    setActiveStatus(status);
    setWhatLearned("");
    setWhatCompleted("");
    setEvidenceType("notes");
    setEvidenceText("");
    setStuckReason("procrastination");
    setStuckExplanation("");
  }

  async function submitFinalize() {
    if (!activeTask || !activeStatus) return;
    setError("");

    const body =
      activeStatus === "DONE"
        ? {
            status: "DONE",
            whatLearned: whatLearned.trim(),
            whatCompleted: whatCompleted.trim(),
            evidenceType,
            evidenceText: evidenceText.trim(),
          }
        : {
            status: "STUCK",
            reason: stuckReason,
            explanation: stuckExplanation.trim(),
          };

    try {
      const res = await fetch(`/api/tasks/${activeTask._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update task.");
        if (res.status === 423) setLocked(true);
        return;
      }
      setTasks((prev) => prev.map((t) => (t._id === activeTask._id ? data.task : t)));
      setActiveTask(null);
      setActiveStatus(null);
    } catch {
      setError("An error occurred.");
    }
  }

  const completedCount = tasks.filter((t) => (t.status ?? (t.completed ? "DONE" : "PENDING")) === "DONE").length;
  const stuckCount = tasks.filter((t) => (t.status ?? (t.completed ? "DONE" : "PENDING")) === "STUCK").length;

  if (locked) return <CheckInLock />;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Tasks</h1>
        <p className="text-gray-400 mt-1">Execution list. Only DONE or STUCK. No deletes.</p>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400">Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          max={format(new Date(), "yyyy-MM-dd")}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-sm"
        />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Create Task</h2>
          <span className={`text-xs px-2 py-1 rounded-full ${windowOpen ? "bg-green-500/20 text-green-400" : "bg-gray-800 text-gray-500"}`}>
            {windowOpen ? "Window Open (10 PM - 12 AM)" : "Window Closed"}
          </span>
        </div>
        {!windowOpen && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-sm">
            Task creation is only allowed between 10:00 PM and 12:00 AM.
          </div>
        )}
        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">{success}</div>}

        <form onSubmit={handleCreate} className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            disabled={!windowOpen || creating}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 disabled:opacity-50"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            disabled={!windowOpen || creating}
            rows={2}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 resize-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!windowOpen || creating || !title.trim()}
            className="w-full py-2.5 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {creating ? "Creating..." : "Add Task"}
          </button>
        </form>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Task List</h2>
          {tasks.length > 0 && <span className="text-xs text-gray-400">{completedCount} done • {stuckCount} stuck • {tasks.length} total</span>}
        </div>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : tasks.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No tasks for this date.</p>
        ) : (
          <ul className="space-y-3">
            {tasks.map((task) => {
              const status = task.status ?? (task.completed ? "DONE" : "PENDING");
              return (
                <li key={task._id} className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full mb-1 inline-block ${
                      status === "DONE"
                        ? "text-green-400 bg-green-500/20 border border-green-500/30"
                        : status === "STUCK"
                        ? "text-red-300 bg-red-500/20 border border-red-500/30"
                        : "text-gray-300 bg-gray-700 border border-gray-600"
                    }`}
                    >
                      {status}
                    </span>
                    <p className={`text-sm font-medium ${status === "PENDING" ? "text-white" : "text-gray-300"}`}>{task.title}</p>
                    {task.description && <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>}
                    {status === "DONE" && (
                      <p className="text-xs text-cyan-300 mt-1">
                        Learned: {task.doneWhatLearned} • Completed: {task.doneWhatCompleted}
                      </p>
                    )}
                    {status === "STUCK" && (
                      <p className="text-xs text-red-300 mt-1">
                        {task.stuckReason}: {task.stuckExplanation}
                      </p>
                    )}
                  </div>
                  {status === "PENDING" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => startFinalize(task, "DONE")}
                        className="px-2 py-1 text-xs rounded-md bg-green-600/30 text-green-300 hover:bg-green-600/40"
                      >
                        Done
                      </button>
                      <button
                        onClick={() => startFinalize(task, "STUCK")}
                        className="px-2 py-1 text-xs rounded-md bg-red-600/30 text-red-300 hover:bg-red-600/40"
                      >
                        Stuck
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {activeTask && activeStatus && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-3">
          <h3 className="text-white font-semibold">
            Finalize: {activeTask.title} ({activeStatus})
          </h3>
          {activeStatus === "DONE" ? (
            <>
              <textarea value={whatLearned} onChange={(e) => setWhatLearned(e.target.value)} rows={2} placeholder="What was learned" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm" />
              <textarea value={whatCompleted} onChange={(e) => setWhatCompleted(e.target.value)} rows={2} placeholder="What was completed" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm" />
              <select value={evidenceType} onChange={(e) => setEvidenceType(e.target.value as "notes" | "commands" | "code_snippet" | "writeup")} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm">
                <option value="notes">notes</option>
                <option value="commands">commands</option>
                <option value="code_snippet">code snippet</option>
                <option value="writeup">writeup text</option>
              </select>
              <textarea value={evidenceText} onChange={(e) => setEvidenceText(e.target.value)} rows={4} placeholder="Evidence text" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm" />
            </>
          ) : (
            <>
              <select value={stuckReason} onChange={(e) => setStuckReason(e.target.value as typeof stuckReasons[number])} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm">
                {stuckReasons.map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
              <textarea value={stuckExplanation} onChange={(e) => setStuckExplanation(e.target.value)} rows={4} placeholder="Custom explanation" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm" />
            </>
          )}
          <div className="flex gap-2">
            <button onClick={() => void submitFinalize()} className="px-4 py-2 rounded bg-cyan-700 hover:bg-cyan-600 text-white text-sm">
              Submit
            </button>
            <button onClick={() => { setActiveTask(null); setActiveStatus(null); }} className="px-4 py-2 rounded bg-gray-700 text-gray-200 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
