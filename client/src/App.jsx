import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import ReactGA from "react-ga4";
import Home from "./pages/Home";
import Upload from "./pages/Upload";
import MyActivity from "./pages/MyActivity";
import Scanner from "./pages/Scanner";
import Stats from "./pages/Stats";
import Leaderboard from "./components/Leaderboard";

import ItemDetail from "./pages/ItemDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import Poster from "./pages/Poster";
import { AuthProvider } from "./context/AuthContext";

// Initialize GA4
const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || "G-DEMO12345";
ReactGA.initialize(MEASUREMENT_ID);

// Component to track page views
const AnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // Send pageview with path
    ReactGA.send({
      hitType: "pageview",
      page: location.pathname + location.search,
    });
    console.log("GA4 Pageview:", location.pathname);
  }, [location]);

  return null;
};

function App() {
  return (
    <Router>
      <AnalyticsTracker />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/my-activity" element={<MyActivity />} />
        <Route path="/item/:id" element={<ItemDetail />} />
        <Route path="/item/:id/poster" element={<Poster />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/scan" element={<Scanner />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </Router>
  );
}

export default App;
