import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Search,
  PlusCircle,
  User,
  Bell,
  CheckCircle,
  Home,
  List,
  BarChart2,
} from "lucide-react";
import Button from "./Button";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import PhoneBanner from "./PhoneBanner";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Layout = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  // Notification State
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // --- Notification Logic ---
  // 1. Fetch notifications on mount + Polling (30s)
  // 2. Register for Firebase Cloud Messaging (FCM)
  // 3. Listen for foreground messages
  useEffect(() => {
    let intervalId;
    if (user) {
      fetchNotifications();

      // POLL: Fetch every 30 seconds to keep list fresh even if FCM fails (e.g. HTTP mobile)
      intervalId = setInterval(fetchNotifications, 30000);

      const registerToken = async () => {
        try {
          const { requestForToken, onMessageListener } = await import(
            "../firebase"
          );
          const token = await requestForToken();
          if (token) {
            await api.post("/claims/notifications/token", { token });
            console.log("FCM Token registered with backend");
          }

          // Handle incoming messages while app is open
          onMessageListener().then((payload) => {
            console.log("Foreground notification:", payload);

            // UX: Show visible "Toast" popup
            toast.info(
              <div>
                <p className="font-bold text-sm">
                  {payload.notification?.title}
                </p>
                <p className="text-xs">{payload.notification?.body}</p>
              </div>,
              { icon: <Bell size={18} className="text-secondary" /> }
            );

            fetchNotifications(); // Refresh list immediately
          });
        } catch (e) {
          console.error("FCM Setup failed (likely permissions blocked)", e);
        }
      };

      registerToken();
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/claims/notifications");
      setNotifications(res.data);
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.post("/claims/notifications/read", { id });
      // UI Optimistic Update for instant feedback
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (e) {
      console.error("Mark read failed", e);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      <ToastContainer
        position="top-center"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastClassName="!bg-surface !text-text !border !border-white/10 !rounded-xl !shadow-2xl"
      />
      <PhoneBanner />
      {/* Navbar */}
      <nav className="border-b border-surface/50 sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between relative">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-10 h-10 object-contain rounded-lg"
            />
            <span className="text-xl font-medium tracking-tight">
              Campus<span className="text-accent">Find</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
            <Link
              to="/"
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                location.pathname === "/"
                  ? "bg-accent text-black font-bold shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                  : "text-muted hover:text-white hover:bg-white/5"
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/my-activity"
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                location.pathname === "/my-activity"
                  ? "bg-accent text-black font-bold shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                  : "text-muted hover:text-white hover:bg-white/5"
              }`}
            >
              My Activity
            </Link>
            <Link
              to="/stats"
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                location.pathname === "/stats"
                  ? "bg-accent text-black font-bold shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                  : "text-muted hover:text-white hover:bg-white/5"
              }`}
            >
              Insights
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {/* Search removed as requested */}
            <Link to="/upload">
              <Button variant="primary" className="!px-4 !py-2 text-sm">
                <PlusCircle size={18} />{" "}
                <span className="hidden sm:inline">Report Item</span>
              </Button>
            </Link>

            {user ? (
              <>
                <div className="relative">
                  <button
                    className="p-2 hover:bg-white/5 rounded-full relative transition-colors"
                    onClick={() => setShowNotifications(!showNotifications)}
                  >
                    <Bell size={20} />
                    {(notifications || []).filter((n) => !n.read).length >
                      0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50"></span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute top-12 right-0 w-80 bg-surface border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 zoom-in-95 duration-200">
                      <div className="p-3 border-b border-white/5 bg-white/5 font-bold text-sm flex justify-between items-center">
                        <span>Notifications</span>
                        {(notifications || []).filter((n) => !n.read).length >
                          0 && (
                          <span className="text-xs text-accent">
                            {
                              (notifications || []).filter((n) => !n.read)
                                .length
                            }{" "}
                            new
                          </span>
                        )}
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {Array.isArray(notifications) &&
                        notifications.length > 0 ? (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              className={`p-3 border-b border-white/5 hover:bg-white/5 transition-colors flex gap-3 ${
                                !n.read ? "bg-accent/5" : "opacity-60"
                              }`}
                            >
                              <div
                                className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                                  !n.read ? "bg-accent" : "bg-transparent"
                                }`}
                              ></div>
                              <div className="flex-1">
                                <Link
                                  to={n.link}
                                  className="text-sm hover:text-accent block mb-1"
                                  onClick={() => setShowNotifications(false)}
                                >
                                  {n.text}
                                </Link>
                                <p className="text-[10px] text-muted">
                                  {new Date(n.time).toLocaleString()}
                                </p>
                              </div>
                              {!n.read && (
                                <button
                                  onClick={() => markAsRead(n.id)}
                                  className="text-xs text-muted hover:text-white self-start"
                                  title="Mark as read"
                                >
                                  <CheckCircle size={14} />
                                </button>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-muted text-sm">
                            No new notifications
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <Button
                    variant="ghost"
                    className="!p-2"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                  >
                    {user.profile_photo ? (
                      <img
                        src={user.profile_photo}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <User size={20} />
                    )}
                  </Button>

                  {/* Dropdown for logout */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-surface border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-top-2 zoom-in-95 duration-200 z-50">
                      <div className="px-3 py-2 border-b border-white/5 mb-1 bg-white/5">
                        <p className="text-sm font-medium text-white truncate">
                          {user.name}
                        </p>
                        <p className="text-[10px] text-muted truncate">
                          {user.email}
                        </p>
                      </div>
                      <Link
                        to="/profile"
                        className="block px-3 py-2 text-sm hover:bg-white/5 transition-colors text-text"
                        onClick={() => setShowUserMenu(false)}
                      >
                        My Profile
                      </Link>
                      <button
                        onClick={logout}
                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link to="/login">
                <Button variant="secondary" className="!px-5 !py-2 text-sm">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content with bottom padding for mobile nav */}
      <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-lg border-t border-white/10 z-50 px-6 py-3 flex justify-between items-center safe-area-bottom">
        <Link
          to="/"
          className={`flex flex-col items-center gap-1 transition-colors ${
            location.pathname === "/"
              ? "text-accent"
              : "text-muted hover:text-white"
          }`}
        >
          <Home size={24} />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link
          to="/my-activity"
          className={`flex flex-col items-center gap-1 transition-colors ${
            location.pathname === "/my-activity"
              ? "text-accent"
              : "text-muted hover:text-white"
          }`}
        >
          <List size={24} />
          <span className="text-[10px] font-medium">Activity</span>
        </Link>
        <Link
          to="/stats"
          className={`flex flex-col items-center gap-1 transition-colors ${
            location.pathname === "/stats"
              ? "text-accent"
              : "text-muted hover:text-white"
          }`}
        >
          <BarChart2 size={24} />
          <span className="text-[10px] font-medium">Insights</span>
        </Link>
        <Link
          to="/profile"
          className={`flex flex-col items-center gap-1 transition-colors ${
            location.pathname === "/profile"
              ? "text-accent"
              : "text-muted hover:text-white"
          }`}
        >
          {user && user.profile_photo ? (
            <img
              src={user.profile_photo}
              className={`w-6 h-6 rounded-full object-cover ${
                location.pathname === "/profile" ? "ring-2 ring-accent" : ""
              }`}
              alt="Profile"
            />
          ) : (
            <User size={24} />
          )}
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </div>
    </div>
  );
};

export default Layout;
