import React, { useState, useEffect, Suspense } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Plus, User, Bell, Home, List, BarChart2 } from "lucide-react";
import Button from "./Button";
import { useAuth } from "../AuthContext";
import api from "../api";
import PhoneBanner from "./PhoneBanner";
import SafeImage from "./SafeImage";
import { formatDateTime } from "../format";

const LINKS = [
  { to: "/", label: "Browse", icon: Home },
  { to: "/my-activity", label: "My items", icon: List },
  { to: "/stats", label: "Insights", icon: BarChart2 },
];

const NOTIFICATION_POLL_MS = 30000;

const Avatar = ({ user, size = "h-7 w-7" }) =>
  user.profile_photo ? (
    <SafeImage
      src={user.profile_photo}
      className={`${size} rounded-full object-cover`}
      fallbackClassName={`${size} rounded-full`}
      fallbackIconSize={14}
      fallbackText=""
      alt=""
    />
  ) : (
    <span className={`${size} flex items-center justify-center rounded-full bg-subtle text-xs font-semibold`}>
      {user.name?.[0]?.toUpperCase() || <User size={14} />}
    </span>
  );

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const load = () =>
      api
        .get("/claims/notifications")
        .then((res) => setNotifications(res.data))
        .catch((e) => console.error("Failed to fetch notifications", e));
    load();
    const id = setInterval(load, NOTIFICATION_POLL_MS);
    return () => clearInterval(id);
  }, []);

  const markAsRead = (id) =>
    api
      .post("/claims/notifications/read", { id })
      .then(() => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))))
      .catch((e) => console.error("Mark read failed", e));

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        className="relative rounded-lg p-2 text-muted hover:bg-subtle hover:text-text"
        onClick={() => setOpen(!open)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
      >
        <Bell size={20} />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-lost" aria-hidden="true" />}
      </button>

      {open && (
        <div className="panel absolute right-0 top-12 z-50 w-80 overflow-hidden shadow-lg shadow-black/40">
          <p className="border-b border-line px-4 py-3 text-sm font-semibold">
            Notifications{unread > 0 && <span className="font-normal text-muted"> ({unread} new)</span>}
          </p>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">Claims on your items and updates on your claims show up here.</p>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  to={n.link}
                  onClick={() => {
                    setOpen(false);
                    if (!n.read) markAsRead(n.id);
                  }}
                  className={`flex gap-3 border-b border-line px-4 py-3 last:border-0 hover:bg-subtle ${n.read ? "text-muted" : ""}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-accent"}`} />
                  <span className="min-w-0">
                    <span className="block text-sm">{n.text}</span>
                    <span className="mt-0.5 block text-xs text-muted">{formatDateTime(n.time)}</span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const UserMenu = ({ user, logout }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        className="rounded-full p-0.5 hover:ring-2 hover:ring-line"
        onClick={() => setOpen(!open)}
        aria-label="Account menu"
        aria-expanded={open}
      >
        <Avatar user={user} />
      </button>
      {open && (
        <div className="panel absolute right-0 top-11 z-50 w-56 overflow-hidden py-1 shadow-lg shadow-black/40">
          <div className="border-b border-line px-4 py-2.5">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <Link to="/profile" className="block px-4 py-2 text-sm hover:bg-subtle" onClick={() => setOpen(false)}>
            Profile
          </Link>
          <button onClick={logout} className="w-full px-4 py-2 text-left text-sm text-lost hover:bg-lost/5">
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};

/** Shared page chrome (top bar, mobile tab bar). Pages render into the <Outlet />. */
const Layout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <PhoneBanner />

      <header className="sticky top-0 z-40 border-b border-line bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center gap-8 px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="h-8 w-8 rounded-md object-contain" />
            <span className="text-lg font-bold">
              CampusFind
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive ? "bg-accent font-semibold text-background" : "text-muted hover:bg-subtle hover:text-text"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link to="/upload">
              <Button className="px-3 sm:px-4">
                <Plus size={16} /> <span className="hidden sm:inline">Report an item</span>
              </Button>
            </Link>
            {user ? (
              <>
                <Notifications />
                <UserMenu user={user} logout={logout} />
              </>
            ) : (
              <Link to="/login">
                <Button variant="secondary">Sign in</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 px-4 py-8 pb-24 md:pb-12">
        <Suspense fallback={<p className="py-20 text-center text-muted">Loading...</p>}>
          <Outlet />
        </Suspense>
      </main>

      <nav
        className="safe-area-bottom fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-line bg-surface/95 pt-2 backdrop-blur md:hidden"
        aria-label="Main"
      >
        {[...LINKS, { to: "/profile", label: "Profile", icon: User }].map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 text-[11px] font-medium ${isActive ? "text-accent" : "text-muted"}`
            }
          >
            <Icon size={22} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
