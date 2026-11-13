import React, { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../AuthContext";
import Button from "../components/Button";
import SafeImage from "../components/SafeImage";
import api from "../api";

const Stat = ({ value, label }) => (
  <div>
    <p className="display text-3xl tabular-nums">{value}</p>
    <p className="mt-1 text-sm text-muted">{label}</p>
  </div>
);

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user.name || "",
    phone: user.phone || "",
    bio: user.bio || "",
    profile_photo: user.profile_photo || "",
  });

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put("/auth/profile", form);
      updateUser({ ...user, ...res.data.user });
      setEditing(false);
      toast.success("Profile saved.");
    } catch (error) {
      toast.error(error.response?.data?.error || "Your profile couldn't be saved. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-5">
        {user.profile_photo ? (
          <SafeImage
            src={user.profile_photo}
            alt=""
            className="h-20 w-20 rounded-full object-cover"
            fallbackClassName="h-20 w-20 rounded-full"
            fallbackIconSize={22}
            fallbackText=""
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-subtle text-2xl font-bold">
            {user.name?.[0]?.toUpperCase() || "?"}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="display truncate text-3xl">{user.name || "Your profile"}</h1>
          <p className="mt-1 truncate text-muted">{user.email}</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-6 border-y border-line py-6">
        <Stat value={user.trust_score || 0} label="Trust points" />
        <Stat value={user.stats?.reported || 0} label="Reports" />
        <Stat value={user.stats?.recovered || 0} label="Returned" />
      </div>
      <p className="mt-3 text-sm text-muted">You earn 10 trust points each time you hand an item back to its owner.</p>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Details</h2>
          {!editing && (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { field: "name", label: "Name", max: 100 },
              { field: "phone", label: "Phone", max: 20, placeholder: "+91 99999 99999", type: "tel" },
              { field: "profile_photo", label: "Photo URL", max: 500, placeholder: "https://…", type: "url" },
            ].map(({ field, label, max, placeholder, type = "text" }) => (
              <label key={field} className="block">
                <span className="mb-1.5 block text-sm font-medium">{label}</span>
                <input type={type} className="w-full" value={form[field]} onChange={set(field)} maxLength={max} placeholder={placeholder} />
              </label>
            ))}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">About you</span>
              <textarea className="h-24 w-full" value={form.bio} onChange={set("bio")} maxLength={1000} placeholder="Department, year, the best way to find you" />
            </label>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save profile"}
              </Button>
              <Button variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <dl className="divide-y divide-line rounded-xl border border-line bg-surface">
            {[
              ["Phone", user.phone || "Not added. Finders use it to reach you."],
              ["About you", user.bio || "Not added"],
            ].map(([label, value]) => (
              <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[8rem_1fr]">
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  );
};

export default Profile;
