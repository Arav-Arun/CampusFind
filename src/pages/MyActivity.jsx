import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ItemCard from "../components/ItemCard";
import { itemState } from "../format";
import api from "../api";

const Section = ({ title, items, empty }) => (
  <section>
    <h2 className="mb-4 text-lg font-bold">
      {title} <span className="font-normal text-muted">{items.length}</span>
    </h2>
    {items.length > 0 ? (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    ) : (
      <p className="rounded-xl border border-dashed border-line p-6 text-sm text-muted">{empty}</p>
    )}
  </section>
);

const MyActivity = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/items/my")
      .then((res) => setItems(res.data))
      .catch((error) => console.error("Failed to fetch my items:", error))
      .finally(() => setLoading(false));
  }, []);

  const open = items.filter((i) => itemState(i) !== "claimed");
  const closed = items.filter((i) => itemState(i) === "claimed");

  return (
    <div>
      <h1 className="display text-4xl">My items</h1>
      <p className="mt-2 text-muted">Everything you reported or claimed.</p>

      {loading ? (
        <p className="py-20 text-center text-muted">Loading your items...</p>
      ) : (
        <div className="mt-8 space-y-12">
          <Section
            title="Open"
            items={open}
            empty={
              <>
                Nothing open right now.{" "}
                <Link to="/upload" className="font-medium text-accent underline underline-offset-2">
                  Report an item
                </Link>
              </>
            }
          />
          <Section title="Returned" items={closed} empty="Items you get back, or hand back, appear here." />
        </div>
      )}
    </div>
  );
};

export default MyActivity;
