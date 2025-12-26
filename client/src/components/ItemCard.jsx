import React from "react";
import { MapPin, Calendar, Tag } from "lucide-react";
import { Link } from "react-router-dom";

const ItemCard = ({ item }) => {
  return (
    <Link to={`/item/${item.id}`}>
      <div className="bg-surface rounded-xl overflow-hidden border border-white/5 hover:border-accent/30 transition-all duration-300 shadow-lg hover:shadow-accent/10 group cursor-pointer hover:scale-[1.02] active:scale-[0.98]">
        <div className="aspect-video bg-black/50 relative overflow-hidden">
          <img
            src={
              item.image_url ||
              "https://placehold.co/600x400/202124/FFF?text=No+Image"
            }
            alt={item.description}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div
            className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              item.type === "lost"
                ? "bg-red-500/90 text-white"
                : "bg-accent/90 text-black"
            }`}
          >
            {item.type}
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-accent transition-colors">
              {item.description}
            </h3>
          </div>

          <div className="space-y-2 text-sm text-muted">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-primary" />
              <span className="truncate">{item.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-primary" />
              <span>{item.date_lost || "Recently"}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-2">
            {item.category && (
              <span className="px-2 py-1 rounded-md bg-secondary/30 text-xs text-muted-foreground flex items-center gap-1">
                <Tag size={10} /> {item.category}
              </span>
            )}
            {item.color && (
              <span className="px-2 py-1 rounded-md bg-secondary/30 text-xs text-muted-foreground">
                {item.color}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ItemCard;
