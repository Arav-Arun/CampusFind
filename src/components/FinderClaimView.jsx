import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import Button, { buttonClass } from "./Button";
import { formatDateTime } from "../format";

const HandoffTicket = ({ claim }) => (
  <div className="ticket">
    <div className="p-5">
      <p className="font-medium">Your claim was accepted</p>
      <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-muted">Meet at</dt>
          <dd className="mt-0.5 font-medium">{claim.meeting_location}</dd>
        </div>
        <div>
          <dt className="text-muted">When</dt>
          <dd className="mt-0.5 font-medium">{formatDateTime(claim.meeting_time)}</dd>
        </div>
      </dl>
    </div>
    <div className="ticket-tear" />
    <div className="p-5 text-center">
      <p className="ticket-code text-4xl text-text sm:text-5xl" aria-label={`Handoff code ${claim.qr_code}`}>
        {claim.qr_code}
      </p>
      <p className="mx-auto mt-3 max-w-xs text-sm text-muted">
        Show this code to the reporter when you meet. They enter it to confirm the handoff.
      </p>
    </div>
  </div>
);

const FinderClaimView = ({ myClaim, item, user, setShowClaimModal }) => {
  const recovered = item.claim_state === "claimed" || item.status === "claimed";

  if (myClaim?.status === "accepted") return <HandoffTicket claim={myClaim} />;

  if (myClaim?.status === "completed") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-found/30 bg-found/5 p-4">
        <CheckCircle className="mt-0.5 shrink-0 text-found" size={20} />
        <div>
          <p className="font-medium">Handoff complete</p>
          <p className="mt-1 text-sm text-muted">This item has been returned. Thanks for using CampusFind.</p>
        </div>
      </div>
    );
  }

  if (myClaim) {
    return (
      <div className="rounded-lg border border-line p-4">
        <p className="font-medium">{myClaim.status === "rejected" ? "Your claim was declined" : "Claim sent"}</p>
        <p className="mt-1 text-sm text-muted">
          {myClaim.status === "rejected"
            ? myClaim.response_message || "The reporter didn't think this was a match."
            : "The reporter will review it and set a time to meet. You'll get a notification."}
        </p>
      </div>
    );
  }

  if (recovered) {
    return (
      <div className="rounded-lg border border-line p-4">
        <p className="font-medium">Already returned</p>
        <p className="mt-1 text-sm text-muted">This item has been recovered, so it can't be claimed again.</p>
      </div>
    );
  }

  const action = item.type === "found" ? "This is mine" : "I found this";
  return user ? (
    <Button onClick={() => setShowClaimModal(true)} className="w-full py-3 text-base">
      {action}
    </Button>
  ) : (
    <Link to="/login" className={buttonClass("primary", "w-full py-3 text-base")}>
      Sign in to claim
    </Link>
  );
};

export default FinderClaimView;
