import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import Button from "./Button";

const OwnerClaimsView = ({ claims, handleRespond, claimToScan, item }) => {
  const itemRecovered = item?.claim_state === "claimed" || item?.status === "claimed";

  return (
    <div className="mt-6">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <ShieldCheck className="text-green-400" /> Claims Received
      </h3>

      {/* SCAN BUTTON FOR OWNER */}
      {claimToScan && (
        <div className="mb-4 p-4 bg-accent/10 border border-accent rounded-xl animate-pulse">
          <h4 className="font-bold text-accent mb-2">Claim Accepted!</h4>
          <p className="text-sm text-muted mb-3">
            Please verify the claimant by entering their 6-digit verification code.
          </p>
          <Link to="/scan">
            <Button variant="primary" className="w-full font-bold">
              <div className="flex items-center gap-2 justify-center">
                Enter Verification Code
              </div>
            </Button>
          </Link>
        </div>
      )}

      {claims.length === 0 ? (
        <p className="text-muted text-sm">No one has claimed this item yet.</p>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => (
            <div
              key={claim.id}
              className="p-4 bg-background rounded-xl border border-white/10"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center font-bold text-accent">
                    {claim.claimant?.name?.[0]}
                  </div>
                  <div>
                    <p className="font-bold">{claim.claimant?.name}</p>
                    <p className="text-xs text-muted">Message: "{claim.message}"</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs uppercase font-bold status-${claim.status}`}
                >
                  {claim.status}
                </span>
              </div>

              {claim.status === "pending" && itemRecovered && (
                <div className="mt-3 text-sm bg-accent/10 p-2 rounded text-accent">
                  This item has already been recovered.
                </div>
              )}

              {claim.status === "pending" && !itemRecovered && (
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={() => handleRespond(claim.id, "accept")}
                    variant="primary"
                    className="!py-1 !text-xs"
                  >
                    Accept & Meet
                  </Button>
                  <Button
                    onClick={() => handleRespond(claim.id, "reject")}
                    variant="secondary"
                    className="!py-1 !text-xs !bg-red-500/20 !text-red-400"
                  >
                    Reject
                  </Button>
                </div>
              )}

              {claim.status === "accepted" && (
                <div className="mt-3 text-sm bg-accent/10 p-2 rounded text-accent">
                  <p>
                    Meeting scheduled at <b>{claim.meeting_location}</b> on{" "}
                    <b>{new Date(claim.meeting_time).toLocaleString()}</b>
                  </p>
                </div>
              )}

              {claim.status === "completed" && (
                <div className="mt-3 text-sm bg-blue-500/10 p-2 rounded text-blue-400 font-bold text-center">
                  Claims Process Completed via 6-digit Code Verification
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OwnerClaimsView;
