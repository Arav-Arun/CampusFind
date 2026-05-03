import React from "react";
import Button from "./Button";

const ItemModals = ({
  showClaimModal,
  setShowClaimModal,
  showAcceptModal,
  setShowAcceptModal,
  itemType,
  claimMessage,
  setClaimMessage,
  submitClaim,
  submittingClaim,
  meetingDetails,
  setMeetingDetails,
  handleRespond,
}) => {
  return (
    <>
      {showClaimModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface p-6 rounded-2xl w-full max-w-md border border-white/10">
            <h2 className="text-xl font-bold mb-4">
              {itemType === "found" ? "Claim Ownership" : "Report Finding"}
            </h2>

            <textarea
              className="w-full bg-background border border-white/10 rounded-xl p-3 h-32 outline-none focus:border-accent"
              placeholder={
                itemType === "found"
                  ? "Describe proof of ownership (e.g., unique scratch, contents)..."
                  : "Where did you find it? Please provide details to help the owner verify."
              }
              value={claimMessage}
              onChange={(e) => setClaimMessage(e.target.value)}
            />

            <div className="flex gap-3 mt-4">
              <Button
                onClick={submitClaim}
                variant="primary"
                className="flex-1"
                disabled={submittingClaim}
              >
                {submittingClaim ? "Sending..." : "Send Request"}
              </Button>
              <Button
                onClick={() => setShowClaimModal(false)}
                variant="ghost"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAcceptModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface p-6 rounded-2xl w-full max-w-md border border-white/10">
            <h2 className="text-xl font-bold mb-4 text-accent">
              Accept Claim & Schedule Meeting
            </h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm text-muted">Meeting Location</label>
                <input
                  className="w-full bg-background border border-white/10 rounded-lg p-2 mt-1"
                  placeholder="e.g. Library Entrance"
                  value={meetingDetails.location}
                  onChange={(e) =>
                    setMeetingDetails({
                      ...meetingDetails,
                      location: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm text-muted">Date & Time</label>
                <input
                  type="datetime-local"
                  className="w-full bg-background border border-white/10 rounded-lg p-2 mt-1"
                  value={meetingDetails.time}
                  onChange={(e) =>
                    setMeetingDetails({
                      ...meetingDetails,
                      time: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => handleRespond(null, "accept")}
                variant="primary"
                className="flex-1 !bg-accent !text-black font-bold"
              >
                Confirm Meeting
              </Button>
              <Button
                onClick={() => setShowAcceptModal(false)}
                variant="ghost"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ItemModals;
