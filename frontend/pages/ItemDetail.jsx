import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../components/Layout";
import { ArrowLeft, CheckCircle, Sparkles } from "lucide-react";
import Button from "../components/Button";
import { useAuth } from "../AuthContext";
import api from "../api";

import ItemInfoCard from "../components/ItemInfoCard";
import ReporterProfile from "../components/ReporterProfile";
import OwnerClaimsView from "../components/OwnerClaimsView";
import FinderClaimView from "../components/FinderClaimView";
import MatchList from "../components/MatchList";
import ItemModals from "../components/ItemModals";

const ItemDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loading, setLoading] = useState(true);

  // Claims State
  const [claims, setClaims] = useState([]);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimMessage, setClaimMessage] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Accept Modal State
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [meetingDetails, setMeetingDetails] = useState({ location: "", time: "" });

  // AI Re-analysis
  const [analyzing, setAnalyzing] = useState(false);

  // Derived State
  const isOwner = user && item && item.user_id === user.id;
  const myClaim = !isOwner && claims.length > 0 ? claims[0] : null;
  const claimToScan = isOwner ? claims.find((c) => c.status === "accepted") : null;

  useEffect(() => {
    fetchItemAndMatches();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user && item) {
      fetchClaims();
    }
  }, [user, item]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchItemAndMatches = async () => {
    try {
      const itemRes = await api.get(`/items/${id}`);
      setItem(itemRes.data);
      setLoading(false);

      const matchRes = await api.get(`/items/match/${id}`);
      setMatches(Array.isArray(matchRes.data) ? matchRes.data : []);
    } catch (error) {
      console.error("Failed to fetch:", error);
    } finally {
      setLoadingMatches(false);
    }
  };

  const fetchClaims = async () => {
    try {
      const res = await api.get(`/claims/item/${id}`);
      setClaims(res.data);
    } catch (e) {
      console.error("Failed to fetch claims", e);
    }
  };

  const handleReanalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await api.post(`/items/${id}/analyze`);
      setItem((prev) => ({
        ...prev,
        ...res.data.tags,
        distinctive_features: res.data.tags.features,
      }));
      alert("Item re-analyzed successfully! Tags updated.");
    } catch (e) {
      alert("Analysis failed: " + e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const submitClaim = async () => {
    setSubmittingClaim(true);
    try {
      await api.post("/claims/", { item_id: id, message: claimMessage });
      setShowClaimModal(false);
      fetchClaims();
      alert("✅ Claim request sent successfully! The owner will be notified.");
    } catch (e) {
      if (e.response?.status === 401) {
        alert("⚠️ Session Expired. Please Log Out and Log In again to submit.");
      } else {
        alert("❌ Failed to submit claim: " + (e.response?.data?.error || e.message));
      }
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
          return alert("Please fill in both meeting location and time.");
        }
        payload.meeting_location = meetingDetails.location;
        payload.meeting_time = new Date(meetingDetails.time).toISOString();
      }

      await api.post(`/claims/${claimId || selectedClaimId}/respond`, payload);
      setShowAcceptModal(false);
      fetchClaims();
      fetchItemAndMatches();
    } catch (e) {
      if (e.response?.status === 401) {
        alert("⚠️ Session Expired. Please Log Out and Log In again.");
      } else {
        alert("❌ Action failed: " + (e.response?.data?.error || e.message));
      }
    }
  };

  // Polling for status updates
  useEffect(() => {
    let interval;
    if (myClaim?.status === "accepted" || (isOwner && claims.some((c) => c.status === "accepted"))) {
      interval = setInterval(() => {
        fetchClaims();
        fetchItemAndMatches();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [myClaim?.status, isOwner, claims]); // eslint-disable-line react-hooks/exhaustive-deps

  // Success Effect
  const completedClaim = claims.find((c) => c.status === "completed");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (completedClaim && !showSuccessModal) {
      setShowSuccessModal(true);
      const timer = setTimeout(() => setShowSuccessModal(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [completedClaim]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Layout><div className="text-center py-20 text-muted">Loading...</div></Layout>;
  if (!item) return <Layout><div className="text-center py-20 text-muted">Item not found</div></Layout>;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto pb-20">
        <div className="flex justify-between items-center mb-4">
          <Link to="/">
            <Button variant="ghost">
              <ArrowLeft size={18} /> Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* SUCCESS MODAL */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-surface p-8 rounded-2xl max-w-sm w-full text-center border border-green-500/50 shadow-[0_0_50px_rgba(34,197,94,0.2)]">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20">
                <CheckCircle size={40} className="text-black" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Item Recovered!</h2>
              <p className="text-muted mb-6">The verification process is complete. The item has been marked as recovered.</p>
              <div className="bg-white/5 rounded-xl p-4 mb-6">
                <p className="items-center gap-2 font-bold text-accent flex justify-center">
                  <Sparkles size={16} /> Points Awarded
                </p>
              </div>
              <Button onClick={() => (window.location.href = "/")} variant="primary" className="w-full">
                Back to Home
              </Button>
            </div>
          </div>
        )}

        <div className="bg-surface rounded-2xl p-6 mb-8 border border-white/5 relative overflow-hidden">
          <ItemInfoCard
            item={item}
            isOwner={isOwner}
            analyzing={analyzing}
            handleReanalyze={handleReanalyze}
          >
            <ReporterProfile reporter={item.reporter} />

            {isOwner ? (
              <OwnerClaimsView
                claims={claims}
                handleRespond={handleRespond}
                claimToScan={claimToScan}
                item={item}
              />
            ) : (
              <FinderClaimView
                myClaim={myClaim}
                item={item}
                user={user}
                setShowClaimModal={setShowClaimModal}
              />
            )}
          </ItemInfoCard>
        </div>

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

      <style>{`
        .tag { @apply px-3 py-1 bg-background rounded-full text-sm border border-white/5; }
        .status-pending { @apply text-yellow-500 bg-yellow-500/10; }
        .status-accepted { @apply text-green-500 bg-green-500/10; }
        .status-rejected { @apply text-red-500 bg-red-500/10; }
        .status-completed { @apply text-blue-500 bg-blue-500/10; }
      `}</style>
    </Layout>
  );
};

export default ItemDetail;
