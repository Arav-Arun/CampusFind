import React from "react";
import { CheckCircle } from "lucide-react";
import Button from "./Button";

const FinderClaimView = ({ myClaim, item, user, setShowClaimModal }) => {
  const itemUnavailable = item.claim_state === "claimed" || item.status === "claimed";

  if (myClaim) {
    return (
      <div className="mt-6 p-5 bg-background border border-accent/20 rounded-xl">
        <h3 className="font-bold text-lg mb-2">My Claim Status</h3>
        <div className="flex items-center justify-between mb-4">
          <span className={`text-xl font-bold uppercase status-${myClaim.status}`}>
            {myClaim.status}
          </span>
        </div>

        {myClaim.status === "pending" && (
          <p className="text-muted">Waiting for the reporter to respond...</p>
        )}

        {myClaim.status === "accepted" && (
          <div className="space-y-4">
            <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
              <h4 className="font-bold text-green-400 flex items-center gap-2">
                <CheckCircle size={16} /> Claim Accepted!
              </h4>
              <p className="text-sm mt-1">
                Please meet the reporter at the location below to verify and collect your item.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted">Location</p>
                <p className="font-bold">{myClaim.meeting_location}</p>
              </div>
              <div>
                <p className="text-muted">Time</p>
                <p className="font-bold">
                  {new Date(myClaim.meeting_time).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="text-center pt-4 border-t border-white/10">
              <p className="text-xs text-muted mb-2">
                Share this code with the reporter to verify
              </p>
              <div className="bg-black/50 rounded-xl p-6 mb-2 border border-accent/30">
                <p className="text-4xl font-mono font-bold tracking-[0.2em] text-accent">
                  {myClaim.qr_code}
                </p>
              </div>
              <p className="text-[10px] text-muted uppercase tracking-widest">
                VERIFICATION CODE
              </p>
            </div>
          </div>
        )}

        {myClaim.status === "completed" && (
          <div className="p-4 bg-green-500 text-white rounded-xl text-center">
            <h3 className="font-bold text-lg flex items-center justify-center gap-2">
              <CheckCircle /> Recovered!
            </h3>
            <p className="text-sm mt-1">This item is now officially yours.</p>
          </div>
        )}
      </div>
    );
  }

  if (itemUnavailable) {
    return (
      <div className="mt-6 p-5 bg-background border border-white/10 rounded-xl">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
          <CheckCircle className="text-green-400" size={18} /> Item recovered
        </h3>
        <p className="text-sm text-muted">
          This item has already been recovered, so it cannot be claimed again.
        </p>
      </div>
    );
  }

  // If no claim is made yet:
  return (
    <div className="mt-6 space-y-3">
      <Button
        onClick={() => setShowClaimModal(true)}
        variant="primary"
        className="w-full text-lg py-4"
      >
        {item.type === "found" ? "This Item is Mine!" : "I Found This Item!"}
      </Button>
      {!user && (
        <p className="text-center text-xs text-muted">
          You must be logged in to claim.
        </p>
      )}
    </div>
  );
};

export default FinderClaimView;
