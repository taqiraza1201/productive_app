"use client";

import { useEffect, useState } from "react";
import CheckInLock from "@/components/CheckInLock";

interface Review {
  _id: string;
  weekStartDate: string;
  improved: string;
  biggestConfusion: string;
  biggestDistraction: string;
  wastedMostTime: string;
  nextWeekTarget: string;
  createdAt: string;
}

export default function ReviewPage() {
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSunday, setIsSunday] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [improved, setImproved] = useState("");
  const [biggestConfusion, setBiggestConfusion] = useState("");
  const [biggestDistraction, setBiggestDistraction] = useState("");
  const [wastedMostTime, setWastedMostTime] = useState("");
  const [nextWeekTarget, setNextWeekTarget] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/discipline/status"), fetch("/api/review")])
      .then(async ([statusRes, reviewRes]) => {
        const status = await statusRes.json();
        if (status.locked) {
          setLocked(true);
          return;
        }
        const reviewData = await reviewRes.json();
        setIsSunday(reviewData.isSunday);
        setReviews(reviewData.reviews ?? []);
      })
      .catch(() => setError("Failed to load review data."))
      .finally(() => setLoading(false));
  }, []);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        improved,
        biggestConfusion,
        biggestDistraction,
        wastedMostTime,
        nextWeekTarget,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to submit review.");
      return;
    }
    setMessage("Weekly review saved.");
    setImproved("");
    setBiggestConfusion("");
    setBiggestDistraction("");
    setWastedMostTime("");
    setNextWeekTarget("");
    const refresh = await fetch("/api/review");
    const refreshData = await refresh.json();
    setReviews(refreshData.reviews ?? []);
  }

  if (loading) return <p className="text-gray-400">Loading...</p>;
  if (locked) return <CheckInLock title="Check-in required before weekly review." />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Weekly Review</h1>
        <p className="text-gray-400 mt-1">Sunday reflection is mandatory.</p>
      </div>

      {!isSunday && (
        <div className="bg-gray-900 border border-amber-500/40 rounded-xl p-4 text-amber-300 text-sm">
          Review submission opens on Sunday. You can still read your history below.
        </div>
      )}

      {isSunday && (
        <form onSubmit={submitReview} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          {error && <p className="text-red-300 text-sm">{error}</p>}
          {message && <p className="text-green-400 text-sm">{message}</p>}
          <textarea value={improved} onChange={(e) => setImproved(e.target.value)} rows={2} placeholder="What improved this week?" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm" />
          <textarea value={biggestConfusion} onChange={(e) => setBiggestConfusion(e.target.value)} rows={2} placeholder="Biggest confusion?" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm" />
          <textarea value={biggestDistraction} onChange={(e) => setBiggestDistraction(e.target.value)} rows={2} placeholder="Biggest distraction?" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm" />
          <textarea value={wastedMostTime} onChange={(e) => setWastedMostTime(e.target.value)} rows={2} placeholder="What wasted the most time?" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm" />
          <textarea value={nextWeekTarget} onChange={(e) => setNextWeekTarget(e.target.value)} rows={2} placeholder="Main target next week?" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm" />
          <button type="submit" className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 rounded text-white text-sm">
            Submit weekly review
          </button>
        </form>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-3">Review History</h2>
        {reviews.length === 0 ? (
          <p className="text-gray-500 text-sm">No weekly reviews yet.</p>
        ) : (
          <ul className="space-y-3">
            {reviews.map((item) => (
              <li key={item._id} className="bg-gray-800 rounded-lg p-3 text-sm">
                <p className="text-cyan-300 mb-1">Week: {item.weekStartDate}</p>
                <p className="text-gray-300">Improved: {item.improved}</p>
                <p className="text-gray-400">Confusion: {item.biggestConfusion}</p>
                <p className="text-gray-400">Distraction: {item.biggestDistraction}</p>
                <p className="text-gray-400">Wasted: {item.wastedMostTime}</p>
                <p className="text-gray-300">Next target: {item.nextWeekTarget}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
