import React, { useState, useEffect } from "react";
import { Trophy, Medal, User } from "lucide-react";
import { Chart } from "react-google-charts";
import api from "../api";

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

  // Prepare chart data
  const chartData = [["User", "Trust Score", { role: "style" }]];
  users.slice(0, 5).forEach((u, i) => {
    const color =
      i === 0
        ? "#eab308"
        : i === 1
        ? "#9ca3af"
        : i === 2
        ? "#ea580c"
        : "#3b82f6";
    chartData.push([u.name, u.trust_score, color]);
  });

  return (
    <div className="bg-surface rounded-xl border border-white/10 p-5 mt-8">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Trophy className="text-yellow-400" size={20} /> Campus Top Finders
      </h3>

      {/* Chart Section */}
      <div className="mb-6">
        <Chart
          chartType="ColumnChart"
          data={chartData}
          options={{
            backgroundColor: "transparent",
            legend: { position: "none" },
            hAxis: {
              title: "User",
              textStyle: { color: "#a1a1aa" },
              titleTextStyle: { color: "#a1a1aa", italic: false },
            },
            vAxis: {
              title: "Trust Score",
              textStyle: { color: "#a1a1aa" },
              titleTextStyle: { color: "#a1a1aa", italic: false },
              gridlines: { color: "#333" },
              minValue: 0,
            },
            chartArea: { width: "80%", height: "70%" },
          }}
          width="100%"
          height="200px"
        />
      </div>

      <div className="space-y-4">
        {users.map((user, index) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-white/5 hover:border-yellow-500/30 transition-colors"
          >
            <div className="flex items-center gap-3">
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
              <div className="flex items-center gap-2">
                {user.profile_photo ? (
                  <img
                    src={user.profile_photo}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">
                    {user.name?.[0]}
                  </div>
                )}
                <div>
                  <p className="font-bold text-sm">{user.name}</p>
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
