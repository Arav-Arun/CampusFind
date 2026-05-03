import React from "react";
import { MapPin, Calendar, Tag, RefreshCw } from "lucide-react";
import SafeImage from "./SafeImage";

const ItemInfoCard = ({ item, isOwner, analyzing, handleReanalyze, children }) => {
  const badgeLabel =
    item.claim_state === "claimed"
      ? "RECOVERED"
      : item.claim_state === "in_progress"
        ? "IN CLAIM"
        : item.type === "lost"
          ? "LOST"
          : "FOUND";
  const badgeClass =
    item.claim_state === "claimed"
      ? "bg-blue-500 text-white"
      : item.claim_state === "in_progress"
        ? "bg-yellow-500 text-black"
        : item.type === "lost"
          ? "bg-red-500 text-white"
          : "bg-green-500 text-white";

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-start">
      <div className="space-y-4">
        <div className="relative aspect-square rounded-xl overflow-hidden bg-background">
          <SafeImage
            src={item.image_url}
            alt={item.description}
            className="w-full h-full object-cover"
            fallbackClassName="w-full h-full"
          />
          <span
            className={`absolute top-4 right-4 px-4 py-1.5 rounded-full text-sm font-bold shadow-lg ${
              badgeClass
            }`}
          >
            {badgeLabel}
          </span>
        </div>
      </div>

      <div className="space-y-6 min-w-0">
        <div>
          <h1 className="text-3xl font-bold mb-2 break-words">{item.description}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted">
            <span className="flex items-center gap-1">
              <MapPin size={16} /> {item.location}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={16} /> {item.date_lost}
            </span>
          </div>
        </div>

        <div className="p-4 bg-background/50 rounded-xl border border-white/5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Tag size={18} className="text-accent" /> AI Analysis
            </h3>
            {isOwner && (
              <button
                onClick={handleReanalyze}
                disabled={analyzing}
                className="text-xs flex items-center gap-1 text-accent hover:underline disabled:opacity-50"
              >
                <RefreshCw size={12} className={analyzing ? "animate-spin" : ""} />
                {analyzing ? "Analyzing..." : "Re-analyze Image"}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {item.category && <span className="tag">{item.category}</span>}
            {item.color && (
              <span className="tag border-accent/20 text-accent">{item.color}</span>
            )}
            {item.brand && <span className="tag">{item.brand}</span>}
            {item.distinctive_features &&
              item.distinctive_features.map((f, i) => (
                <span key={i} className="tag bg-white/5">
                  {f}
                </span>
              ))}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
};

export default ItemInfoCard;
