"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";

interface ProfileData {
  user: {
    username: string;
    email: string;
    currentStreak: number;
    bestStreak: number;
    totalTasksCompleted: number;
    totalActiveDays: number;
    lastActiveDate: string | null;
    createdAt: string;
    completionPercentage: number;
  };
}

function Badge({ streak }: { streak: number }) {
  if (streak >= 30) return <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full text-sm">🏆 Legend (30+ days)</span>;
  if (streak >= 14) return <span className="px-3 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full text-sm">🔥 Hot Streak (14+ days)</span>;
  if (streak >= 7) return <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full text-sm">⚡ Active (7+ days)</span>;
  if (streak >= 3) return <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-sm">🌱 Growing (3+ days)</span>;
  return <span className="px-3 py-1 bg-gray-700 text-gray-400 rounded-full text-sm">🆕 Just Started</span>;
}

export default function ProfilePage() {
  const { update } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [username, setUsername] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        setProfile(d);
        setUsername(d.user?.username ?? "");
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!username.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Username updated!");
        setEditing(false);
        await update({ name: username.trim() });
        if (profile) setProfile({ user: { ...profile.user, username: username.trim() } });
      } else {
        setMessage(data.error ?? "Failed to update.");
      }
    } catch {
      setMessage("An error occurred.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) return <p className="text-red-400">Failed to load profile.</p>;

  const { user } = profile;
  const isActiveToday = user.lastActiveDate
    ? format(new Date(user.lastActiveDate), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
    : false;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Profile</h1>

      {/* Avatar + status */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-cyan-500/20 border-2 border-cyan-500/40 flex items-center justify-center text-2xl font-bold text-cyan-400">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-white">{user.username}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full ${isActiveToday ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
              {isActiveToday ? "✓ Active Today" : "✗ Inactive Today"}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">{user.email}</p>
          <p className="text-gray-500 text-xs mt-1">Member since {format(new Date(user.createdAt), "MMM yyyy")}</p>
        </div>
      </div>

      {/* Badges */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-3">Streak Badge</h3>
        <Badge streak={user.currentStreak} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Current Streak", value: `🔥 ${user.currentStreak}`, sub: "days" },
          { label: "Best Streak", value: `⚡ ${user.bestStreak}`, sub: "days" },
          { label: "Tasks Done", value: user.totalTasksCompleted, sub: "completed" },
          { label: "Active Days", value: user.totalActiveDays, sub: "total" },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Edit username */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4">Edit Profile</h3>
        {message && (
          <div className={`mb-3 p-2 rounded text-sm ${message.includes("updated") || message.includes("!") ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"}`}>
            {message}
          </div>
        )}
        <div className="flex gap-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={!editing || saving}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 disabled:opacity-60"
          />
          {editing ? (
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => { setEditing(false); setUsername(user.username); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition-colors">
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
