import React, { useState, useEffect } from "react";
import { Trophy, Medal } from "lucide-react";
import api from "../api";
import SafeImage from "./SafeImage";

const rankColor = (index) => {
  if (index === 0) return "#eab308";
  if (index === 1) return "#9ca3af";
  if (index === 2) return "#ea580c";
  return "#3b82f6";
};

const Leaderboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get("/auth/leaderboard");
      setUsers(res.data);
    } catch (e) {
      console.error("Failed to fetch leaderboard", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (users.length === 0) return null;

  const topUsers = users.slice(0, 5);
  const maxScore = Math.max(...topUsers.map((u) => u.trust_score || 0), 1);

  return (
    <div className="bg-surface rounded-xl border border-white/10 p-5 mt-8">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Trophy className="text-yellow-400" size={20} /> Campus Top Finders
      </h3>

      <div className="mb-6 space-y-3" aria-label="Top finder trust scores">
        {topUsers.map((user, index) => {
          const score = user.trust_score || 0;
          const width = Math.max((score / maxScore) * 100, 8);

          return (
            <div
              key={user.id}
              className="grid grid-cols-[minmax(72px,1fr)_minmax(0,2fr)_3rem] items-center gap-3 text-xs"
            >
              <span className="truncate text-muted">{user.name}</span>
              <div className="h-3 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${width}%`, backgroundColor: rankColor(index) }}
                />
              </div>
              <span className="text-right font-bold text-text">{score}</span>
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        {users.map((user, index) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-white/5 hover:border-yellow-500/30 transition-colors"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0
                    ? "bg-yellow-500 text-black"
                    : index === 1
                    ? "bg-gray-400 text-black"
                    : index === 2
                    ? "bg-orange-600 text-white"
                    : "bg-surface border border-white/10"
                }`}
              >
                {index + 1}
              </div>
              <div className="flex min-w-0 items-center gap-2">
                {user.profile_photo ? (
                  <SafeImage
                    src={user.profile_photo}
                    className="w-8 h-8 rounded-full object-cover"
                    fallbackClassName="w-8 h-8 rounded-full"
                    fallbackIconSize={16}
                    fallbackText=""
                    alt={user.name}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">
                    {user.name?.[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-bold text-sm">{user.name}</p>
                  <p className="text-xs text-muted">Trust Score</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-yellow-400 font-bold">
              <Medal size={16} /> {user.trust_score}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;
