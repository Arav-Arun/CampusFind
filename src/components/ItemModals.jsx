import React from "react";
import Button from "./Button";

const Modal = ({ title, onClose, children }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    onClick={(e) => e.target === e.currentTarget && onClose()}
    onKeyDown={(e) => e.key === "Escape" && onClose()}
    role="dialog"
    aria-modal="true"
    aria-label={title}
  >
    <div className="panel w-full max-w-md p-6">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {children}
    </div>
  </div>
);

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
}) => (
  <>
    {showClaimModal && (
      <Modal title={itemType === "found" ? "Claim this item" : "Tell the owner you found it"} onClose={() => setShowClaimModal(false)}>
        <label htmlFor="claim-message" className="mb-1.5 block text-sm text-muted">
          {itemType === "found"
            ? "Describe something only the owner would know: a scratch, a sticker, what's inside."
            : "Where and when did you find it? Details help the owner trust you."}
        </label>
        <textarea
          id="claim-message"
          className="h-32 w-full"
          value={claimMessage}
          onChange={(e) => setClaimMessage(e.target.value)}
          autoFocus
        />
        <div className="mt-4 flex gap-2">
          <Button onClick={submitClaim} className="flex-1" disabled={submittingClaim}>
            {submittingClaim ? "Sending..." : "Send claim"}
          </Button>
          <Button onClick={() => setShowClaimModal(false)} variant="secondary">
            Cancel
          </Button>
        </div>
      </Modal>
    )}

    {showAcceptModal && (
      <Modal title="Set a meeting" onClose={() => setShowAcceptModal(false)}>
        <div className="mb-5 space-y-4">
          <div>
            <label htmlFor="meet-location" className="mb-1.5 block text-sm text-muted">
              Where
            </label>
            <input
              id="meet-location"
              className="w-full"
              placeholder="Library entrance"
              value={meetingDetails.location}
              onChange={(e) => setMeetingDetails({ ...meetingDetails, location: e.target.value })}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="meet-time" className="mb-1.5 block text-sm text-muted">
              When
            </label>
            <input
              id="meet-time"
              type="datetime-local"
              className="w-full"
              value={meetingDetails.time}
              onChange={(e) => setMeetingDetails({ ...meetingDetails, time: e.target.value })}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleRespond(null, "accept")} className="flex-1">
            Accept claim
          </Button>
          <Button onClick={() => setShowAcceptModal(false)} variant="secondary">
            Cancel
          </Button>
        </div>
      </Modal>
    )}
  </>
);

export default ItemModals;
