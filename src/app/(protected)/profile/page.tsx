"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import CheckInLock from "@/components/CheckInLock";

interface ProfileData {
  user: {
    username: string;
    email: string;
    currentStreak: number;
    bestStreak: number;
    totalTasksCompleted: number;
    totalActiveDays: number;
    createdAt: string;
  };
}

export default function ProfilePage() {
  const { update } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [username, setUsername] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/discipline/status"), fetch("/api/profile")])
      .then(async ([statusRes, profileRes]) => {
        const status = await statusRes.json();
        if (status.locked) {
          setLocked(true);
          return;
        }
        const d = await profileRes.json();
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
        setMessage("Profile updated.");
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
      setTimeout(() => setMessage(""), 2500);
    }
  }

  if (loading) return <p className="text-gray-400">Loading...</p>;
  if (locked) return <CheckInLock title="Check-in required before profile access." />;
  if (!profile) return <p className="text-red-400">Failed to load profile.</p>;

  const { user } = profile;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Profile</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-2">
        <p className="text-white font-semibold">{user.username}</p>
        <p className="text-gray-400 text-sm">{user.email}</p>
        <p className="text-gray-500 text-xs">Current streak: {user.currentStreak} • Best: {user.bestStreak}</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4">Edit Username</h3>
        {message && <div className="mb-3 p-2 rounded text-sm text-cyan-300 bg-cyan-500/10">{message}</div>}
        <div className="flex gap-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={!editing || saving}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white disabled:opacity-60"
          />
          {editing ? (
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm disabled:opacity-60">
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => { setEditing(false); setUsername(user.username); }} className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg text-sm">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg text-sm">
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
