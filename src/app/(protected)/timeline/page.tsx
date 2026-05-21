"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import CheckInLock from "@/components/CheckInLock";

interface TimelineEvent {
  id: string;
  type: "DONE" | "STUCK" | "CHECK_IN" | "WEEKLY_REVIEW";
  createdAt: string;
  title: string;
  detail: string;
}

export default function TimelinePage() {
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    Promise.all([fetch("/api/discipline/status"), fetch("/api/timeline")])
      .then(async ([statusRes, timelineRes]) => {
        const status = await statusRes.json();
        if (status.locked) {
          setLocked(true);
          return;
        }
        if (timelineRes.ok) {
          const timelineData = await timelineRes.json();
          setTimeline(timelineData.timeline ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-400">Loading...</p>;
  if (locked) return <CheckInLock title="Check-in required before timeline access." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Private Timeline</h1>
        <p className="text-gray-400 mt-1">Personal chronological execution journal.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        {timeline.length === 0 ? (
          <p className="text-gray-500 text-sm">No entries yet.</p>
        ) : (
          <ul className="space-y-3">
            {timeline.map((item) => (
              <li key={`${item.type}-${item.id}`} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-white">
                    <span className="text-cyan-300">{item.type}</span> • {item.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <pre className="text-xs text-gray-300 whitespace-pre-wrap mt-2 font-sans">{item.detail}</pre>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
