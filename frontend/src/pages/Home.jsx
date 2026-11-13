import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import ItemCard from "../components/ItemCard";
import Leaderboard from "../components/Leaderboard";
import Button from "../components/Button";
import api from "../api";

// Each chip is a search term: the server matches it against descriptions and tags.
const CATEGORIES = ["Phone", "Keys", "Wallet", "ID card", "Bottle", "Bag", "Electronics", "Books", "Clothing"];
const TABS = [
  { value: "all", label: "Everything" },
  { value: "lost", label: "Lost" },
  { value: "found", label: "Found" },
];
const PAGE_SIZE = 24;

const Home = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(""); // debounced copy of `search`
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPage = (offset, signal) =>
    api.get("/items", {
      params: {
        type: activeTab === "all" ? undefined : activeTab,
        q: query || selectedCategory || undefined,
        limit: PAGE_SIZE,
        offset,
      },
      signal,
    });

  // Reload from the first page whenever a filter changes; cancel stale requests.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchPage(0, controller.signal)
      .then((res) => {
        setItems(res.data.items);
        setHasMore(res.data.has_more);
        setLoading(false);
      })
      .catch((error) => {
        if (error.code === "ERR_CANCELED") return;
        console.error("Failed to fetch items:", error);
        setLoading(false);
      });
    return () => controller.abort();
  }, [activeTab, selectedCategory, query]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await fetchPage(items.length);
      setItems((prev) => [...prev, ...res.data.items]);
      setHasMore(res.data.has_more);
    } catch (error) {
      console.error("Failed to load more items:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const filtered = Boolean(query || selectedCategory || activeTab !== "all");

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="min-w-0">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display text-4xl sm:text-5xl">Lost and found</h1>
            <p className="mt-2 max-w-md text-muted">Everything reported on campus, newest first.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/upload?type=lost">
              <Button variant="secondary">I lost something</Button>
            </Link>
            <Link to="/upload?type=found">
              <Button>I found something</Button>
            </Link>
          </div>
        </div>

        <div className="mb-6 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Search reports</span>
              <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="search"
                placeholder="Search by item, colour, brand or place"
                className="w-full py-2.5 pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <div className="flex rounded-lg border border-line bg-surface p-1" role="tablist" aria-label="Report type">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  role="tab"
                  aria-selected={activeTab === tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === tab.value ? "bg-accent font-semibold text-background" : "text-muted hover:text-text"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {CATEGORIES.map((name) => {
              const active = selectedCategory === name;
              return (
                <button
                  key={name}
                  onClick={() => setSelectedCategory(active ? null : name)}
                  aria-pressed={active}
                  className={`whitespace-nowrap rounded-md border px-3 py-1 text-sm transition-colors ${
                    active ? "border-accent bg-accent font-medium text-background" : "border-line bg-surface hover:border-text/40"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        {loading && items.length === 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading reports">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-line bg-surface p-2">
                <div className="aspect-[4/3] rounded-lg bg-subtle" />
                <div className="mx-1.5 mb-2 mt-4 h-3 w-1/3 rounded bg-subtle" />
                <div className="mx-1.5 mb-2 h-4 w-3/4 rounded bg-subtle" />
              </div>
            ))}
          </div>
        ) : !loading && items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line px-6 py-16 text-center">
            <p className="font-medium">{filtered ? "No reports match that." : "Nothing has been reported yet."}</p>
            <p className="mt-1 text-sm text-muted">
              {filtered ? "Try a different word, or clear the filters." : "Lost or found something? Report it and it shows up here."}
            </p>
          </div>
        ) : (
          <>
            <div
              className={`grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${loading ? "opacity-50" : ""}`}
              aria-busy={loading}
            >
              {items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-8 text-center">
                <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Loading..." : "Show more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Leaderboard />
      </aside>
    </div>
  );
};

export default Home;
