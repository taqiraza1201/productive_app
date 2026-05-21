"use client";

import { useEffect, useState } from "react";

type RecoveryTask = "revise_notes" | "linux_command_practice" | "packet_analysis" | "focused_study_15m";

interface CheckInData {
  _id: string;
  studyMinutes: number;
  studied: string;
  biggestConfusion: string;
  tomorrowTarget: string;
  recoveryTask: RecoveryTask | "";
  noZeroDaySaved: boolean;
}

export default function CheckInPage() {
  const [checkIn, setCheckIn] = useState<CheckInData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [studyMinutes, setStudyMinutes] = useState(45);
  const [studied, setStudied] = useState("");
  const [biggestConfusion, setBiggestConfusion] = useState("");
  const [tomorrowTarget, setTomorrowTarget] = useState("");
  const [recoveryTask, setRecoveryTask] = useState<RecoveryTask>("revise_notes");

  useEffect(() => {
    fetch("/api/check-in")
      .then((res) => res.json())
      .then((data) => {
        if (data.checkIn) {
          setCheckIn(data.checkIn);
          setStudyMinutes(data.checkIn.studyMinutes);
          setStudied(data.checkIn.studied);
          setBiggestConfusion(data.checkIn.biggestConfusion);
          setTomorrowTarget(data.checkIn.tomorrowTarget);
          setRecoveryTask((data.checkIn.recoveryTask || "revise_notes") as RecoveryTask);
        }
      })
      .catch(() => setError("Failed to load check-in."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studyMinutes,
          studied,
          biggestConfusion,
          tomorrowTarget,
          recoveryTask,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to submit check-in.");
        return;
      }
      setCheckIn(data.checkIn);
      setMessage("Check-in saved.");
    } catch {
      setError("An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Daily Check-in</h1>
        <p className="text-gray-400 mt-1">Mandatory. Submit this before accessing the rest of the system.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        {checkIn && <p className="text-xs text-cyan-300 mb-3">Today&apos;s check-in already exists. Submitting will update it.</p>}
        {error && <p className="text-sm text-red-300 mb-3">{error}</p>}
        {message && <p className="text-sm text-green-400 mb-3">{message}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm text-gray-300">Study time (minutes)</label>
            <input type="number" min={0} max={1440} value={studyMinutes} onChange={(e) => setStudyMinutes(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm" />
          </div>
          <textarea value={studied} onChange={(e) => setStudied(e.target.value)} rows={3} placeholder="What was studied?" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm" />
          <textarea value={biggestConfusion} onChange={(e) => setBiggestConfusion(e.target.value)} rows={3} placeholder="Biggest confusion?" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm" />
          <textarea value={tomorrowTarget} onChange={(e) => setTomorrowTarget(e.target.value)} rows={3} placeholder="Tomorrow target?" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm" />

          <div>
            <label className="text-sm text-gray-300">No-zero-day recovery task</label>
            <select value={recoveryTask} onChange={(e) => setRecoveryTask(e.target.value as RecoveryTask)} className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm">
              <option value="revise_notes">revise notes</option>
              <option value="linux_command_practice">1 Linux command practice</option>
              <option value="packet_analysis">1 packet analysis</option>
              <option value="focused_study_15m">15 mins focused study</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Required when you have no DONE tasks today.</p>
          </div>

          <button type="submit" disabled={saving} className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 rounded text-white text-sm disabled:opacity-50">
            {saving ? "Saving..." : "Submit check-in"}
          </button>
        </form>
      </div>
    </div>
  );
}
