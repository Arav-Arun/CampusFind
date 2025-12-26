import React, { useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";
import api from "../api";
import {
  ShieldCheck,
  Award,
  Handshake,
  Sparkles,
  BarChart2,
  Search,
} from "lucide-react";

const Profile = () => {
  const { user } = useAuth(); // Need to update context user on save
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    bio: user?.bio || "",
    profile_photo: user?.profile_photo || "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put("/auth/profile", formData);
      // Update auth context
      // Assuming AuthProvider exposes a way to set user,
      // but currently it exposes setUser but we access it via user value.
      // We need to reload or manually update the user object in context.
      window.location.reload(); // Simple brute force for now to refresh context
    } catch {
      alert("Failed to update profile");
    }
    setIsEditing(false);
  };

  if (!user) return <Layout>Please login</Layout>;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Profile</h1>
          <Button onClick={() => setIsEditing(!isEditing)} variant="secondary">
            {isEditing ? "Cancel" : "Edit Profile"}
          </Button>
        </div>

        <div className="bg-surface rounded-2xl p-6 border border-white/5 space-y-6">
          {/* Photo */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center text-2xl font-bold text-accent overflow-hidden border-2 border-accent/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                {user.profile_photo ? (
                  <img
                    src={user.profile_photo}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user.name?.[0].toUpperCase()
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-surface border border-accent rounded-full w-8 h-8 flex items-center justify-center shadow-lg text-xs font-bold text-accent">
                {Math.floor((user.trust_score || 0) / 50) + 1}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                {user.name}
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-muted font-normal">
                  Level {Math.floor((user.trust_score || 0) / 50) + 1}
                </span>
              </h2>
              <p className="text-muted">{user.email}</p>

              {/* Trust Score Progress */}
              <div className="mt-3 w-48">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-accent font-bold">
                    {user.trust_score || 0} XP
                  </span>
                  <span className="text-muted">
                    Next: {(Math.floor((user.trust_score || 0) / 50) + 1) * 50}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-500"
                    style={{
                      width: `${(((user.trust_score || 0) % 50) / 50) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Name</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-background border border-white/10 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">
                  Phone Number
                </label>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-background border border-white/10 rounded-lg px-4 py-2"
                  placeholder="+91 99999 99999"
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  className="w-full bg-background border border-white/10 rounded-lg px-4 py-2 h-24"
                  placeholder="Tell us a bit about yourself..."
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">
                  Profile Photo URL
                </label>
                <input
                  name="profile_photo"
                  value={formData.profile_photo}
                  onChange={handleChange}
                  className="w-full bg-background border border-white/10 rounded-lg px-4 py-2"
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
              <Button type="submit" variant="primary" className="w-full">
                Save Changes
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted">Phone</p>
                <p>{user.phone || "Not added"}</p>
              </div>
              <div>
                <p className="text-sm text-muted">Bio</p>
                <p>{user.bio || "No bio added"}</p>
              </div>
            </div>
          )}
        </div>

        {/* GAMIFICATION STATS */}
        {!isEditing && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Activity Stats */}
            <div className="bg-surface rounded-2xl p-6 border border-white/5">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <BarChart2 className="text-accent" size={20} /> Community Impact
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-background rounded-xl text-center border border-white/5">
                  <p className="text-2xl font-bold text-white">
                    {user.stats?.reported || 0}
                  </p>
                  <p className="text-xs text-muted uppercase tracking-wider">
                    Reports
                  </p>
                </div>
                <div className="p-4 bg-background rounded-xl text-center border border-white/5">
                  <p className="text-2xl font-bold text-green-400">
                    {user.stats?.recovered || 0}
                  </p>
                  <p className="text-xs text-muted uppercase tracking-wider">
                    Recovered
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Badges */}
            <div className="bg-surface rounded-2xl p-6 border border-white/5">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Award className="text-yellow-400" size={20} /> Badges
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {/* Scout Badge */}
                <div
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 border ${
                    (user.stats?.reported || 0) >= 1
                      ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                      : "bg-white/5 border-transparent opacity-30 grayscale"
                  }`}
                >
                  <Search size={24} />
                  <span className="text-[10px] font-bold">Scout</span>
                </div>

                {/* Good Samaritan */}
                <div
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 border ${
                    (user.stats?.recovered || 0) >= 1
                      ? "bg-green-500/20 border-green-500/50 text-green-400"
                      : "bg-white/5 border-transparent opacity-30 grayscale"
                  }`}
                >
                  <Handshake size={24} />
                  <span className="text-[10px] font-bold text-center leading-tight">
                    Good Samaritan
                  </span>
                </div>

                {/* Super Finder */}
                <div
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 border ${
                    (user.stats?.recovered || 0) >= 5
                      ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                      : "bg-white/5 border-transparent opacity-30 grayscale"
                  }`}
                >
                  <Sparkles size={24} />
                  <span className="text-[10px] font-bold text-center leading-tight">
                    Super Finder
                  </span>
                </div>

                {/* Guardian */}
                <div
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 border ${
                    (user.trust_score || 0) >= 100
                      ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                      : "bg-white/5 border-transparent opacity-30 grayscale"
                  }`}
                >
                  <ShieldCheck size={24} />
                  <span className="text-[10px] font-bold">Guardian</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Profile;
