import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import ItemCard from "../components/ItemCard";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import Button from "../components/Button";

const MyActivity = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchMyItems();
    }
  }, [user]);

  const fetchMyItems = async () => {
    setLoading(true);
    try {
      const response = await api.get("/items/my");
      setItems(response.data);
    } catch (error) {
      console.error("Failed to fetch my items:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-2xl font-bold mb-4">Please Sign In</h2>
          <p className="text-muted mb-8">
            You need to be logged in to view your activity.
          </p>
          <Link to="/login">
            <Button variant="primary">Sign In</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">My Activity</h1>
        <p className="text-muted">Manage your reported lost and found items</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted">
          Loading your items...
        </div>
      ) : (
        <div className="space-y-12">
          {/* Section 1: In Progress */}
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-2 h-8 bg-yellow-500 rounded-full"></span>
              In Progress
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.isArray(items) &&
              items.filter((i) => i.status !== "claimed").length > 0 ? (
                items
                  .filter((i) => i.status !== "claimed")
                  .map((item) => <ItemCard key={item.id} item={item} />)
              ) : (
                <div className="col-span-full py-8 text-muted italic">
                  No active items.
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Completed */}
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-2 h-8 bg-accent rounded-full"></span>
              Completed History
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 opacity-80 hover:opacity-100 transition-opacity">
              {Array.isArray(items) &&
              items.filter((i) => i.status === "claimed").length > 0 ? (
                items
                  .filter((i) => i.status === "claimed")
                  .map((item) => <ItemCard key={item.id} item={item} />)
              ) : (
                <div className="col-span-full py-8 text-muted italic">
                  No completed history yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default MyActivity;
