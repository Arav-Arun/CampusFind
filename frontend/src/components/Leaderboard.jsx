import React, { useState, useEffect } from "react";
import api from "../api";
import SafeImage from "./SafeImage";

/** Top finders by trust score (earned from verified handoffs). */
const Leaderboard = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api
      .get("/auth/leaderboard")
      .then((res) => setUsers(res.data))
      .catch((e) => console.error("Failed to fetch leaderboard", e));
  }, []);

  if (users.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-bold">Top finders</h2>
      <p className="mb-3 mt-1 text-sm text-muted">Points for every item returned to its owner.</p>
      <ol className="divide-y divide-line rounded-xl border border-line bg-surface">
        {users.map((user, index) => (
          <li key={user.id} className="flex items-center gap-3 px-4 py-3">
            <span className="w-4 text-sm tabular-nums text-muted">{index + 1}</span>
            {user.profile_photo ? (
              <SafeImage
                src={user.profile_photo}
                className="h-7 w-7 rounded-full object-cover"
                fallbackClassName="h-7 w-7 rounded-full"
                fallbackIconSize={14}
                fallbackText=""
                alt=""
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-subtle text-xs font-semibold">
                {user.name?.[0]?.toUpperCase() || "?"}
              </span>
            )}
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{user.name || "Student"}</span>
            <span className="text-sm font-semibold tabular-nums">{user.trust_score}</span>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default Leaderboard;
