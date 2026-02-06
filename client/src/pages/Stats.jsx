import React, { useState, useEffect } from "react";
import { Chart } from "react-google-charts";
import api from "../api";
import Layout from "../components/Layout";

const Stats = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await api.get("/items/?type=all");
      setItems(res.data);
    } catch (error) {
      console.error("Failed to fetch items for stats", error);
    } finally {
      setLoading(false);
    }
  };

  // Responsive check
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 1. Lost vs Found (Active vs Total)
  const activeLostCount = items.filter(
    (i) => i.type === "lost" && i.status === "unresolved"
  ).length;
  const activeFoundCount = items.filter(
    (i) => i.type === "found" && i.status === "unresolved"
  ).length;

  // Chart Data: Keep historical distribution or switch to active?
  // User asked for consistency with "what matches website", so let's stick to showing status clearly.
  // Actually for the "Type" chart, let's keep showing Total distribution because that's interesting info (what gets lost more).
  const lostCount = items.filter((i) => i.type === "lost").length;
  const foundCount = items.filter((i) => i.type === "found").length;

  const typeData = [
    ["Type", "Count"],
    ["Lost Reports", lostCount],
    ["Found Reports", foundCount],
  ];

  // 2. Status Distribution
  const resolvedCount = items.filter(
    (i) =>
      i.status === "claimed" ||
      i.status === "matched" ||
      i.status === "completed"
  ).length;
  const unresolvedCount = items.filter((i) => i.status === "unresolved").length;
  const statusData = [
    ["Status", "Count"],
    ["Resolved/Returned", resolvedCount],
    ["Still Missing", unresolvedCount],
  ];

  // ... (rest of categories) ...
  const categoryMap = {};
  items.forEach((item) => {
    let cat = item.category || "Uncategorized";
    // Normalize to Title Case to merge "bottle", "Bottle", "BOTTLE"
    cat = cat.trim();
    cat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();

    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  const categoryData = [["Category", "Count"], ...Object.entries(categoryMap)];

  // ... (rest of location) ...
  const locationMap = {};
  items.forEach((item) => {
    const loc = (item.location || "Unknown").split(",")[0].trim();
    locationMap[loc] = (locationMap[loc] || 0) + 1;
  });
  const locationData = [
    ["Location", "Count"],
    ...Object.entries(locationMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5),
  ];

  // ... (chart options) ...
  const commonOptions = {
    backgroundColor: "transparent",
    legend: {
      position: isMobile ? "bottom" : "right",
      textStyle: { color: "#a1a1aa", fontSize: isMobile ? 12 : 14 },
    },
    chartArea: {
      width: isMobile ? "100%" : "90%",
      height: isMobile ? "75%" : "80%",
      left: isMobile ? 20 : 50,
      right: isMobile ? 20 : 50,
      top: isMobile ? 20 : 50,
      bottom: isMobile ? 50 : 50,
    },
  };

  const pieOptions = {
    ...commonOptions,
    pieSliceBorderColor: "#18181b",
    colors: ["#ef4444", "#22c55e", "#eab308", "#3b82f6"],
    fontSize: isMobile ? 12 : 14,
    chartArea: {
      width: "90%",
      height: isMobile ? "75%" : "80%",
    },
    legend: {
      position: isMobile ? "bottom" : "right",
      textStyle: { color: "#a1a1aa", fontSize: isMobile ? 12 : 14 },
      alignment: "center",
    },
  };

  if (loading)
    return (
      <Layout>
        <div className="p-8 text-center text-muted">Loading insights...</div>
      </Layout>
    );

  return (
    <Layout>
      <div className="w-full min-h-screen p-4 md:p-6 animate-in fade-in duration-500 space-y-6 md:space-y-8 pb-24 md:pb-8">
        <div className="flex justify-center mb-6 md:mb-10">
          <div className="transform rotate-1 transition-transform hover:rotate-0 duration-300">
            <h1 className="text-3xl md:text-4xl font-black bg-accent text-black px-6 py-3 md:px-8 md:py-4 shadow-[4px_4px_0px_rgba(255,255,255,0.2)]">
              Campus Insights
            </h1>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div className="glass-card p-4 md:p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
            <span className="text-muted text-xs md:text-sm uppercase tracking-widest font-bold text-center">
              Total Reports
            </span>
            <span className="text-2xl md:text-4xl font-bold mt-2 text-white">
              {items.length}
            </span>
          </div>
          <div className="glass-card p-4 md:p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
            <span className="text-muted text-xs md:text-sm uppercase tracking-widest font-bold text-center">
              Active Lost
            </span>
            <span className="text-2xl md:text-4xl font-bold mt-2 text-red-400">
              {activeLostCount}
            </span>
          </div>
          <div className="glass-card p-4 md:p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
            <span className="text-muted text-xs md:text-sm uppercase tracking-widest font-bold text-center">
              Active Found
            </span>
            <span className="text-2xl md:text-4xl font-bold mt-2 text-green-400">
              {activeFoundCount}
            </span>
          </div>
          <div className="glass-card p-4 md:p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
            <span className="text-muted text-xs md:text-sm uppercase tracking-widest font-bold text-center">
              Resolution
            </span>
            <span className="text-2xl md:text-4xl font-bold mt-2 text-accent">
              {items.length > 0
                ? Math.round((resolvedCount / items.length) * 100)
                : 0}
              %
            </span>
          </div>
        </div>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Lost vs Found */}
          <div className="glass-card p-4 md:p-8 rounded-3xl border border-white/5">
            <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-2">
              <span className="w-2 h-6 md:h-8 bg-blue-500 rounded-full"></span>
              Lost vs. Found
            </h2>
            <Chart
              chartType="PieChart"
              data={typeData}
              options={{
                ...pieOptions,
                colors: ["#ef4444", "#22c55e"],
              }}
              width={"100%"}
              height={isMobile ? "300px" : "400px"}
            />
          </div>

          {/* Resolution Rate */}
          <div className="glass-card p-4 md:p-8 rounded-3xl border border-white/5">
            <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-2">
              <span className="w-2 h-6 md:h-8 bg-accent rounded-full"></span>
              Resolution Status
            </h2>
            <Chart
              chartType="PieChart"
              data={statusData}
              options={{
                ...pieOptions,
                pieHole: 0.4,
                colors: ["#22c55e", "#71717a"],
              }}
              width={"100%"}
              height={isMobile ? "300px" : "400px"}
            />
          </div>

          {/* Categories - Full Width */}
          <div className="col-span-1 lg:col-span-2 glass-card p-4 md:p-8 rounded-3xl border border-white/5">
            <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-2">
              <span className="w-2 h-6 md:h-8 bg-yellow-400 rounded-full"></span>
              Categories
            </h2>
            <Chart
              chartType="BarChart"
              data={categoryData}
              options={{
                backgroundColor: "transparent",
                legend: { position: "none" },
                hAxis: {
                  textStyle: { color: "#ffffff", fontSize: isMobile ? 12 : 12 },
                  gridlines: { color: "#333" },
                },
                vAxis: {
                  textStyle: { color: "#ffffff", fontSize: isMobile ? 13 : 14 },
                },
                colors: ["#3b82f6"],
                chartArea: {
                  width: isMobile ? "65%" : "80%",
                  height: "70%",
                  left: isMobile ? 80 : 100,
                },
              }}
              width={"100%"}
              height={isMobile ? "400px" : "500px"}
            />
          </div>

          {/* Top Hotspots - Bar Chart */}
          <div className="col-span-1 lg:col-span-2 glass-card p-4 md:p-8 rounded-3xl border border-white/5">
            <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-2">
              <span className="w-2 h-6 md:h-8 bg-red-500 rounded-full"></span>
              Recent Hotspots
            </h2>
            <Chart
              chartType="BarChart"
              data={locationData}
              options={{
                backgroundColor: "transparent",
                legend: { position: "none" },
                hAxis: {
                  textStyle: { color: "#ffffff", fontSize: isMobile ? 12 : 12 },
                  gridlines: { color: "#333" },
                },
                vAxis: {
                  textStyle: { color: "#ffffff", fontSize: isMobile ? 13 : 13 },
                },
                colors: ["#ef4444"],
                chartArea: {
                  width: isMobile ? "65%" : "80%",
                  height: "70%",
                  left: isMobile ? 80 : 100,
                },
              }}
              width={"100%"}
              height={isMobile ? "300px" : "300px"}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Stats;
