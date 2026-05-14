"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface FeedActivity {
  id: string;
  username: string;
  type: "DONE" | "STUCK";
  taskTitle: string;
  note: string;
  createdAt: string;
}

export default function ActivityPage() {
  const [activity, setActivity] = useState<FeedActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activity")
      .then((res) => res.json())
      .then((data) => setActivity(data.activity ?? []))
      .catch(() => setActivity([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Public Activity Feed</h1>
        <p className="text-gray-400 mt-1">See what public users are learning in real time.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : activity.length === 0 ? (
          <p className="text-gray-500">No public activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {activity.map((item) => (
              <li key={item.id} className="bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-300">
                  <span className="font-semibold text-white">{item.username}</span>{" "}
                  {item.type === "DONE" ? "completed" : "got stuck on"}{" "}
                  <span className="text-cyan-300">{item.taskTitle}</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">{item.note}</p>
                <p className="text-xs text-gray-500 mt-1">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
