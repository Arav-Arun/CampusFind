import React, { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ReactGA from "react-ga4";
import { useAuth } from "./AuthContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import ItemDetail from "./pages/ItemDetail";

// Less-visited pages load on demand: Insights pulls in the charting library and
// the sign-in page pulls in Firebase, so neither slows down browsing.
const Auth = lazy(() => import("./pages/Auth"));
/** React.lazy plus a _preload() hook that starts the download early. */
const lazyPage = (load) => Object.assign(lazy(load), { _preload: load });
const Upload = lazyPage(() => import("./pages/Upload"));
const MyActivity = lazyPage(() => import("./pages/MyActivity"));
const Scanner = lazyPage(() => import("./pages/Scanner"));
const Stats = lazyPage(() => import("./pages/Stats"));
const Profile = lazyPage(() => import("./pages/Profile"));

// Analytics only run when a measurement ID is configured.
const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
if (GA_ID) ReactGA.initialize(GA_ID);

// Fetch the other pages' code while the browser is idle, so opening them is instant.
const preloadPages = () => [Upload, MyActivity, Stats, Profile].forEach((page) => page._preload?.());
if (typeof window !== "undefined") {
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
  window.addEventListener("load", () => idle(preloadPages), { once: true });
}

const PageViews = () => {
  const { pathname, search } = useLocation();
  useEffect(() => {
    if (GA_ID) ReactGA.send({ hitType: "pageview", page: pathname + search });
    window.scrollTo(0, 0);
  }, [pathname, search]);
  return null;
};

/** Sends signed-out visitors to /login instead of rendering the page. */
const RequireAuth = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
};

const App = () => (
  <BrowserRouter>
    <PageViews />
    <ToastContainer position="top-center" autoClose={4000} newestOnTop hideProgressBar theme="dark" />
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/item/:id" element={<ItemDetail />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/upload" element={<RequireAuth><Upload /></RequireAuth>} />
        <Route path="/my-activity" element={<RequireAuth><MyActivity /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/scan" element={<RequireAuth><Scanner /></RequireAuth>} />
        <Route path="*" element={<p className="py-20 text-center text-muted">This page doesn't exist.</p>} />
      </Route>
      <Route path="/login" element={<Suspense fallback={null}><Auth mode="login" /></Suspense>} />
      <Route path="/signup" element={<Suspense fallback={null}><Auth mode="signup" /></Suspense>} />
    </Routes>
  </BrowserRouter>
);

export default App;
