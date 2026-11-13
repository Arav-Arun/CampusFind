import React from "react";
import { Link } from "react-router-dom";
import Button from "./Button";
import { formatDateTime } from "../format";

const STATUS_LABEL = { pending: "Waiting for you", accepted: "Meeting set", rejected: "Declined", completed: "Handed over" };

const OwnerClaimsView = ({ claims, handleRespond, claimToScan, item }) => {
  const recovered = item?.claim_state === "claimed" || item?.status === "claimed";

  return (
    <div className="border-t border-line pt-5">
      <h2 className="mb-3 text-sm font-semibold">Claims on this item</h2>

      {claimToScan && (
        <div className="mb-4 rounded-lg border border-accent/40 bg-accent/5 p-4">
          <p className="font-medium">Meeting {claimToScan.claimant?.name || "the claimant"}?</p>
          <p className="mb-3 mt-1 text-sm text-muted">
            Ask for their 6-digit handoff code and enter it to confirm you returned the item.
          </p>
          <Link to="/scan">
            <Button>Enter handoff code</Button>
          </Link>
        </div>
      )}

      {claims.length === 0 ? (
        <p className="text-sm text-muted">No one has claimed this item yet.</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {claims.map((claim) => (
            <li key={claim.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{claim.claimant?.name || "Student"}</p>
                  {claim.message && <p className="mt-1 break-words text-sm text-muted">“{claim.message}”</p>}
                </div>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold status-${claim.status}`}>
                  {STATUS_LABEL[claim.status] || claim.status}
                </span>
              </div>

              {claim.status === "pending" &&
                (recovered ? (
                  <p className="mt-3 text-sm text-muted">This item was already returned to someone else.</p>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <Button onClick={() => handleRespond(claim.id, "accept")}>Accept and set a meeting</Button>
                    <Button variant="danger" onClick={() => handleRespond(claim.id, "reject")}>
                      Decline
                    </Button>
                  </div>
                ))}

              {claim.status === "accepted" && (
                <p className="mt-3 text-sm">
                  Meeting at <span className="font-medium">{claim.meeting_location}</span>,{" "}
                  {formatDateTime(claim.meeting_time)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default OwnerClaimsView;
