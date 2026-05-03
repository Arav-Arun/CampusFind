import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import ItemCard from "../components/ItemCard";
import Leaderboard from "../components/Leaderboard";
import {
  Filter,
  Key,
  Smartphone,
  Book,
  Headphones,
  Watch,
  Umbrella,
  Glasses,
  HelpCircle,
} from "lucide-react";
import Button from "../components/Button";

const CATEGORIES = [
  { name: "Keys", icon: Key },
  { name: "Phone", icon: Smartphone },
  { name: "Electronics", icon: Headphones },
  { name: "Books", icon: Book },
  { name: "Accessories", icon: Watch },
  { name: "Clothing", icon: Umbrella }, // approximate
  { name: "Others", icon: HelpCircle },
];

const Home = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    fetchItems();
  }, [activeTab, selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchItems = async (searchQuery = "") => {
    setLoading(true);
    try {
      const typeQuery = activeTab === "all" ? "" : `type=${activeTab}`;
      const searchQueryString = searchQuery ? `q=${searchQuery}` : "";

      // Client-side category filter for MVP simplicity (or backend can handle)
      // Since backend has search 'q' that targets category, we can inject category into q

      let finalQ = searchQueryString;
      if (selectedCategory && !searchQuery) {
        finalQ = `q=${selectedCategory}`;
      }

      const queryParams = [typeQuery, finalQ].filter(Boolean).join("&");
      const queryString = queryParams ? `?${queryParams}` : "";

      const response = await fetch(`/api/items${queryString}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setItems(data);
      }
    } catch (error) {
      console.error("Failed to fetch items:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row gap-8">
        {/* LEFT CONTENT */}
        <div className="flex-1">
          <div className="flex flex-col gap-6 mb-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-1">Campus Activity</h1>
                <p className="text-muted">Real-time lost and found updates</p>
              </div>

              <div className="flex bg-surface p-1 rounded-full">
                {["all", "lost", "found"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                      activeTab === tab
                        ? "bg-background text-accent shadow-sm"
                        : "text-muted hover:text-text"
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search items, descriptions, or locations..."
                className="w-full bg-surface border-none rounded-xl px-5 py-3 pl-12 focus:ring-2 focus:ring-accent/50 outline-none text-text placeholder-muted transition-all shadow-sm"
                onChange={(e) => {
                  const query = e.target.value;
                  setTimeout(() => fetchItems(query), 300);
                }}
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
            </div>

            {/* Quick Categories */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all whitespace-nowrap ${
                  !selectedCategory
                    ? "bg-accent text-black border-accent"
                    : "bg-surface border-white/5 hover:border-white/20"
                }`}
              >
                <Filter size={16} /> All
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all whitespace-nowrap ${
                    selectedCategory === cat.name
                      ? "bg-accent text-black border-accent"
                      : "bg-surface border-white/5 hover:border-white/20"
                  }`}
                >
                  <cat.icon size={16} /> {cat.name}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-muted">Loading items...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.length > 0 ? (
                items.map((item) => <ItemCard key={item.id} item={item} />)
              ) : (
                <div className="col-span-full text-center py-20 text-muted">
                  <p>No items found.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR (Leaderboard) */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="sticky top-24">
            <div className="bg-gradient-to-br from-accent/20 to-transparent p-6 rounded-2xl border border-accent/20 mb-6">
              <h3 className="font-bold text-lg mb-2">👋 Welcome back!</h3>
              <p className="text-sm text-muted">
                Did you find something today? Report it and earn Trust Points!
              </p>
            </div>

            <Leaderboard />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Home;
