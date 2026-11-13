import React from "react";
import { itemState } from "../format";

const STATES = {
  claimed: { label: "Recovered", className: "bg-recovered/10 text-recovered" },
  in_progress: { label: "Handoff pending", className: "bg-progress/10 text-progress" },
  lost: { label: "Lost", className: "bg-lost/10 text-lost" },
  found: { label: "Found", className: "bg-found/10 text-found" },
};

const StatusBadge = ({ item, className = "" }) => {
  const { label, className: tone } = STATES[itemState(item)];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${tone} ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
};

export default StatusBadge;
