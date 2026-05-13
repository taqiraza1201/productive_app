import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Task } from "@/models/Task";

async function getLeaderboard() {
  await connectDB();
  const users = await User.find({})
    .select("username currentStreak bestStreak totalTasksCompleted totalActiveDays")
    .sort({ currentStreak: -1, totalTasksCompleted: -1 })
    .limit(50)
    .lean<Array<{
      _id: { toString(): string };
      username: string;
      currentStreak: number;
      bestStreak: number;
      totalTasksCompleted: number;
      totalActiveDays: number;
    }>>();

  return Promise.all(users.map(async (user, i) => {
    const totalTasks = await Task.countDocuments({ userId: user._id });
    const pct = totalTasks > 0 ? Math.round((user.totalTasksCompleted / totalTasks) * 100) : 0;
    return { rank: i + 1, id: user._id.toString(), username: user.username, currentStreak: user.currentStreak, bestStreak: user.bestStreak, totalTasksCompleted: user.totalTasksCompleted, completionPercentage: pct };
  }));
}

function StreakBadge({ streak }: { streak: number }) {
  if (streak >= 30) return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">🏆 Legend</span>;
  if (streak >= 14) return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">🔥 Hot</span>;
  if (streak >= 7) return <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">⚡ Active</span>;
  return null;
}

export default async function LeaderboardPage() {
  let leaderboard: Awaited<ReturnType<typeof getLeaderboard>> = [];
  try {
    leaderboard = await getLeaderboard();
  } catch {
    // DB might not be available
  }

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="min-h-screen bg-gray-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white">🏆 Leaderboard</h1>
          <p className="text-gray-400 mt-2">Top performers in the CyberSec community</p>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-20 text-gray-500">No data yet. Start tracking your consistency!</div>
        ) : (
          <>
            {/* Top 3 */}
            {top3.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {[top3[1], top3[0], top3[2]].filter(Boolean).map((user) => {
                  const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
                  const borders: Record<number, string> = { 1: "border-yellow-500/50", 2: "border-gray-400/40", 3: "border-orange-600/40" };
                  return (
                    <div key={user!.id} className={`bg-gray-900 border ${borders[user!.rank] ?? "border-gray-700"} rounded-xl p-5 text-center ${user!.rank === 1 ? "ring-1 ring-yellow-500/30" : ""}`}>
                      <div className="text-3xl mb-2">{medals[user!.rank] ?? ""}</div>
                      <p className="font-bold text-white text-lg">{user!.username}</p>
                      <p className="text-orange-400 font-semibold">🔥 {user!.currentStreak} days</p>
                      <div className="mt-2 flex justify-center">
                        <StreakBadge streak={user!.currentStreak} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rest of leaderboard */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="hidden sm:grid grid-cols-6 gap-4 px-5 py-3 border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                <span>Rank</span>
                <span className="col-span-2">User</span>
                <span className="text-center">Streak</span>
                <span className="text-center">Best</span>
                <span className="text-center">Done</span>
              </div>
              {(rest.length > 0 ? rest : leaderboard).map((user) => (
                <div key={user.id} className="grid grid-cols-3 sm:grid-cols-6 gap-4 items-center px-5 py-4 border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition-colors">
                  <span className="text-gray-400 font-mono">#{user.rank}</span>
                  <div className="col-span-2 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-xs font-bold text-cyan-400">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-white font-medium text-sm">{user.username}</span>
                      <div className="mt-0.5"><StreakBadge streak={user.currentStreak} /></div>
                    </div>
                  </div>
                  <span className="text-center text-orange-400 font-semibold">🔥 {user.currentStreak}</span>
                  <span className="text-center text-yellow-400">{user.bestStreak}</span>
                  <span className="text-center text-green-400">{user.totalTasksCompleted}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
