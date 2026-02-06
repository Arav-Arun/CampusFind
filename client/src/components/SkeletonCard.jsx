import React from "react";

const SkeletonCard = () => {
  return (
    <div className="bg-surface rounded-xl overflow-hidden border border-white/5 shadow-sm animate-pulse">
      <div className="aspect-video bg-white/5 relative"></div>
      <div className="p-4 space-y-3">
        <div className="h-5 bg-white/10 rounded w-3/4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-white/5 rounded w-1/2"></div>
          <div className="h-3 bg-white/5 rounded w-1/3"></div>
        </div>
        <div className="pt-2 flex gap-2">
          <div className="h-5 w-16 bg-white/5 rounded"></div>
          <div className="h-5 w-16 bg-white/5 rounded"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;
