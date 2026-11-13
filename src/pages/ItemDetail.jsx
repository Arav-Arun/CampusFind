import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, CheckCircle } from "lucide-react";
import Button from "../components/Button";
import { useAuth } from "../AuthContext";
import api from "../api";

import ItemInfoCard from "../components/ItemInfoCard";
import ReporterProfile from "../components/ReporterProfile";
import OwnerClaimsView from "../components/OwnerClaimsView";
import FinderClaimView from "../components/FinderClaimView";
import MatchList from "../components/MatchList";
import ItemModals from "../components/ItemModals";

const POLL_MS = 3000;

const requestError = (e, fallback) =>
  e.response?.status === 401
    ? "Your session expired. Please sign in again."
    : e.response?.data?.error || fallback;

const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const { state } = useLocation();
  // A card passes its summary along, so the page can render before the full item arrives.
  const preview = state?.item?.id === Number(id) ? state.item : null;
  const [item, setItem] = useState(preview);
  const [loading, setLoading] = useState(!preview);
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [claims, setClaims] = useState([]);

  // Claim modal
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimMessage, setClaimMessage] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Accept modal
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [meetingDetails, setMeetingDetails] = useState({ location: "", time: "" });

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const isOwner = Boolean(user && item && item.user_id === user.id);
  const myClaim = !isOwner && claims.length > 0 ? claims[0] : null;
  const claimToScan = isOwner ? claims.find((c) => c.status === "accepted") : null;
  const hasAcceptedClaim = claims.some((c) => c.status === "accepted");
  const completedClaim = claims.find((c) => c.status === "completed");

  const loadItem = useCallback(
    () => api.get(`/items/${id}`).then((res) => setItem(res.data)),
    [id]
  );
  const loadClaims = useCallback(
    () => api.get(`/claims/item/${id}`).then((res) => setClaims(res.data)),
    [id]
  );

  // The item is reloaded once the session is known: contact details depend on who is asking.
  useEffect(() => {
    if (authLoading) return;
    loadItem()
      .catch((e) => console.error("Failed to fetch item", e))
      .finally(() => setLoading(false));
  }, [loadItem, authLoading, user?.id]);

  useEffect(() => {
    setLoadingMatches(true);
    api
      .get(`/items/match/${id}`)
      .then((res) => setMatches(res.data))
      .catch(() => setMatches([]))
      .finally(() => setLoadingMatches(false));
  }, [id]);

  useEffect(() => {
    if (!user) return setClaims([]);
    loadClaims().catch((e) => console.error("Failed to fetch claims", e));
  }, [loadClaims, user]);

  // While a handoff is in progress, poll so both sides see status changes (and the contact details unlocked by acceptance).
  useEffect(() => {
    if (!hasAcceptedClaim) return;
    const timer = setInterval(() => {
      loadClaims().catch(() => {});
      loadItem().catch(() => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [hasAcceptedClaim, loadClaims, loadItem]);

  // Celebrate a handoff that completes while this page is open, not every later visit to a recovered item.
  const sawHandoffPending = useRef(false);
  useEffect(() => {
    if (hasAcceptedClaim) sawHandoffPending.current = true;
  }, [hasAcceptedClaim]);
  useEffect(() => {
    if (completedClaim && sawHandoffPending.current) setShowSuccessModal(true);
  }, [completedClaim?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitClaim = async () => {
    setSubmittingClaim(true);
    try {
      await api.post("/claims/", { item_id: id, message: claimMessage });
      setShowClaimModal(false);
      loadClaims();
      toast.success("Claim sent. The reporter gets a notification.");
    } catch (e) {
      toast.error(requestError(e, "Failed to submit claim"));
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleRespond = async (claimId, action) => {
    if (action === "accept" && !showAcceptModal) {
      setSelectedClaimId(claimId);
      setShowAcceptModal(true);
      return;
    }

    try {
      const payload = { action };
      if (action === "accept") {
        if (!meetingDetails.location || !meetingDetails.time) {
          return toast.warn("Please fill in both meeting location and time.");
        }
        payload.meeting_location = meetingDetails.location;
        payload.meeting_time = new Date(meetingDetails.time).toISOString();
      }

      await api.post(`/claims/${claimId || selectedClaimId}/respond`, payload);
      setShowAcceptModal(false);
      loadClaims();
    } catch (e) {
      toast.error(requestError(e, "Action failed"));
    }
  };

  if (loading) return <p className="py-20 text-center text-muted">Loading...</p>;
  if (!item) {
    return (
      <div className="py-20 text-center">
        <p className="font-medium">This report doesn't exist or was removed.</p>
        <Link to="/" className="mt-2 inline-block text-sm text-accent underline underline-offset-2">
          Back to browsing
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft size={16} /> All reports
      </Link>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="panel w-full max-w-sm p-6 text-center">
            <CheckCircle size={40} className="mx-auto text-found" />
            <h2 className="mt-4 text-2xl font-bold">Item returned</h2>
            <p className="mt-2 text-sm text-muted">
              The handoff is confirmed and the finder earned trust points. This report is now closed.
            </p>
            <div className="mt-6 flex gap-2">
              <Button onClick={() => navigate("/")} className="flex-1">
                Back to browsing
              </Button>
              <Button variant="secondary" onClick={() => setShowSuccessModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <ItemInfoCard item={item}>
        {item.reporter ? (
          <>
            <ReporterProfile reporter={item.reporter} />
            {isOwner ? (
              <OwnerClaimsView claims={claims} handleRespond={handleRespond} claimToScan={claimToScan} item={item} />
            ) : (
              <FinderClaimView myClaim={myClaim} item={item} user={user} setShowClaimModal={setShowClaimModal} />
            )}
          </>
        ) : (
          <div className="h-32 animate-pulse rounded-xl bg-surface" aria-label="Loading details" />
        )}
      </ItemInfoCard>

      <MatchList matches={matches} loadingMatches={loadingMatches} />

      <ItemModals
        showClaimModal={showClaimModal}
        setShowClaimModal={setShowClaimModal}
        showAcceptModal={showAcceptModal}
        setShowAcceptModal={setShowAcceptModal}
        itemType={item.type}
        claimMessage={claimMessage}
        setClaimMessage={setClaimMessage}
        submitClaim={submitClaim}
        submittingClaim={submittingClaim}
        meetingDetails={meetingDetails}
        setMeetingDetails={setMeetingDetails}
        handleRespond={handleRespond}
      />
    </div>
  );
};

export default ItemDetail;
