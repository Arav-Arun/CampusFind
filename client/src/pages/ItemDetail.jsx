import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../components/Layout";
import {
  MapPin,
  Calendar,
  Tag,
  ArrowLeft,
  Sparkles,
  User,
  ShieldCheck,
  CheckCircle,
  XCircle,
  MessageCircle,
  RefreshCw,
  Printer,
} from "lucide-react";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import api from "../api";

const ItemDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loading, setLoading] = useState(true);

  // Claims State
  const [claims, setClaims] = useState([]); // List of claimants (if reporter) OR my claim status (if user)
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimMessage, setClaimMessage] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);

  // Accept Modal State
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [meetingDetails, setMeetingDetails] = useState({
    location: "",
    time: "",
  });

  // AI Re-analysis
  const [analyzing, setAnalyzing] = useState(false);

  // Derived State (Must be defined BEFORE useEffects that use them)
  const isOwner = user && item && item.user_id === user.id;
  const myClaim = !isOwner && claims.length > 0 ? claims[0] : null;

  useEffect(() => {
    fetchItemAndMatches();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch claims when user or item changes
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
        alert(
          "❌ Failed to submit claim: " +
            (e.response?.data?.message || e.response?.data?.error || e.message)
        );
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
    } catch (e) {
      if (e.response?.status === 401) {
        alert("⚠️ Session Expired. Please Log Out and Log In again.");
      } else {
        alert(
          "❌ Action failed: " +
            (e.response?.data?.message || e.response?.data?.error || e.message)
        );
      }
    }
  };

  // Polling for status updates (e.g., waiting for claim to be verified)
  useEffect(() => {
    let interval;
    if (
      myClaim?.status === "accepted" ||
      (isOwner && claims.some((c) => c.status === "accepted"))
    ) {
      interval = setInterval(() => {
        fetchClaims();
        fetchItemAndMatches(); // Also fetch item to check if status -> claimed
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
    }
  }, [completedClaim, showSuccessModal]); // Added showSuccessModal to dependencies

  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => setShowSuccessModal(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

  // Check if I am the finder and there is an accepted claim I need to scan
  const claimToScan = isOwner
    ? claims.find((c) => c.status === "accepted")
    : null;

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted">Loading...</div>
      </Layout>
    );
  }

  if (!item) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted">Item not found</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto pb-20">
        <div className="flex justify-between items-center mb-4">
          <Link to="/">
            <Button variant="ghost">
              <ArrowLeft size={18} />
              Back to Dashboard
            </Button>
          </Link>

          <button
            onClick={() => window.open(`/item/${item.id}/poster`, "_blank")}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all font-bold text-sm"
          >
            <Printer size={16} /> Print Poster using Gemini
          </button>
        </div>

        {/* SUCCESS MODAL */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-surface p-8 rounded-2xl max-w-sm w-full text-center border border-green-500/50 shadow-[0_0_50px_rgba(34,197,94,0.2)]">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20">
                <CheckCircle size={40} className="text-black" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Item Recovered!
              </h2>
              <p className="text-muted mb-6">
                The verification process is complete. The item has been marked
                as recovered.
              </p>

              <div className="bg-white/5 rounded-xl p-4 mb-6">
                <p className="items-center gap-2 font-bold text-accent flex justify-center">
                  <Sparkles size={16} /> Points Awarded
                </p>
              </div>

              <Button
                onClick={() => (window.location.href = "/")}
                variant="primary"
                className="w-full"
              >
                Back to Home
              </Button>
            </div>
          </div>
        )}

        {/* DETAILS CARD */}
        <div className="bg-surface rounded-2xl p-6 mb-8 border border-white/5 relative overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-background">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.description}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted">
                    No Image
                  </div>
                )}
                <span
                  className={`absolute top-4 right-4 px-4 py-1.5 rounded-full text-sm font-bold shadow-lg ${
                    item.type === "lost"
                      ? "bg-red-500 text-white"
                      : "bg-green-500 text-white"
                  }`}
                >
                  {item.type === "lost" ? "LOST" : "FOUND"}
                </span>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{item.description}</h1>
                <div className="flex flex-wrap gap-4 text-sm text-muted">
                  <span className="flex items-center gap-1">
                    <MapPin size={16} /> {item.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={16} /> {item.date_lost}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-background/50 rounded-xl border border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Tag size={18} className="text-accent" /> AI Analysis
                  </h3>
                  {isOwner && (
                    <button
                      onClick={handleReanalyze}
                      disabled={analyzing}
                      className="text-xs flex items-center gap-1 text-accent hover:underline disabled:opacity-50"
                    >
                      <RefreshCw
                        size={12}
                        className={analyzing ? "animate-spin" : ""}
                      />
                      {analyzing ? "Analyzing..." : "Re-analyze Image"}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.category && (
                    <span className="tag">{item.category}</span>
                  )}
                  {item.color && (
                    <span className="tag border-accent/20 text-accent">
                      {item.color}
                    </span>
                  )}
                  {item.brand && <span className="tag">{item.brand}</span>}
                  {item.distinctive_features &&
                    item.distinctive_features.map((f, i) => (
                      <span key={i} className="tag bg-white/5">
                        {f}
                      </span>
                    ))}
                </div>
              </div>

              {/* REPORTER PROFILE */}
              <div className="p-5 bg-surface border border-white/10 rounded-xl">
                <h3 className="text-sm uppercase tracking-wider text-muted font-bold mb-4">
                  Reported By
                </h3>
                <div className="flex items-center gap-4">
                  {item.reporter?.profile_photo ? (
                    <img
                      src={item.reporter.profile_photo}
                      className="w-12 h-12 rounded-full object-cover border border-white/10"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-xl">
                      {item.reporter?.name?.[0] || "?"}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-lg">
                      {item.reporter?.name || "Unknown User"}
                    </p>
                    <p className="text-sm text-muted">{item.reporter?.email}</p>
                  </div>
                </div>

                {/* Contact Details (Only show phone if available) */}
                {(item.reporter?.phone || item.reporter?.contact_info) && (
                  <div className="mt-4 space-y-2 pt-4 border-t border-white/5">
                    {item.reporter?.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center">
                          <MessageCircle size={14} className="text-green-400" />
                        </div>
                        <span>{item.reporter.phone}</span>
                      </div>
                    )}
                    {item.reporter?.contact_info &&
                      item.reporter.contact_info !== item.reporter.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted italic">
                          <span>Note: {item.reporter.contact_info}</span>
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* ACTION AREA - OWNER */}
              {isOwner ? (
                <div className="mt-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <ShieldCheck className="text-green-400" /> Claims Received
                  </h3>

                  {/* SCAN BUTTON FOR OWNER */}
                  {claimToScan && (
                    <div className="mb-4 p-4 bg-accent/10 border border-accent rounded-xl animate-pulse">
                      <h4 className="font-bold text-accent mb-2">
                        Claim Accepted!
                      </h4>
                      <p className="text-sm text-muted mb-3">
                        Please verify the claimant by entering their 6-digit
                        verification code.
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
                    <p className="text-muted text-sm">
                      No one has claimed this item yet.
                    </p>
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
                                <p className="font-bold">
                                  {claim.claimant?.name}
                                </p>
                                <p className="text-xs text-muted">
                                  Message: "{claim.message}"
                                </p>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-1 rounded text-xs uppercase font-bold status-${claim.status}`}
                            >
                              {claim.status}
                            </span>
                          </div>

                          {claim.status === "pending" && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                onClick={() =>
                                  handleRespond(claim.id, "accept")
                                }
                                variant="primary"
                                className="!py-1 !text-xs"
                              >
                                Accept & Meet
                              </Button>
                              <Button
                                onClick={() =>
                                  handleRespond(claim.id, "reject")
                                }
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
                                Meeting scheduled at{" "}
                                <b>{claim.meeting_location}</b> on{" "}
                                <b>
                                  {new Date(
                                    claim.meeting_time
                                  ).toLocaleString()}
                                </b>
                              </p>
                            </div>
                          )}

                          {claim.status === "completed" && (
                            <div className="mt-3 text-sm bg-blue-500/10 p-2 rounded text-blue-400 font-bold text-center">
                              Claims Process Completed via 6-digit Code
                              Verification
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* ACTION AREA - NON OWNER */
                <div className="mt-6">
                  {myClaim ? (
                    <div className="p-5 bg-background border border-accent/20 rounded-xl">
                      <h3 className="font-bold text-lg mb-2">
                        My Claim Status
                      </h3>
                      <div className="flex items-center justify-between mb-4">
                        <span
                          className={`text-xl font-bold uppercase status-${myClaim.status}`}
                        >
                          {myClaim.status}
                        </span>
                      </div>

                      {myClaim.status === "pending" && (
                        <p className="text-muted">
                          Waiting for the reporter to respond...
                        </p>
                      )}

                      {myClaim.status === "accepted" && (
                        <div className="space-y-4">
                          <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                            <h4 className="font-bold text-green-400 flex items-center gap-2">
                              <CheckCircle size={16} /> Claim Accepted!
                            </h4>
                            <p className="text-sm mt-1">
                              Please meet the reporter at the location below to
                              verify and collect your item.
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted">Location</p>
                              <p className="font-bold">
                                {myClaim.meeting_location}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted">Time</p>
                              <p className="font-bold">
                                {new Date(
                                  myClaim.meeting_time
                                ).toLocaleString()}
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
                          <p className="text-sm mt-1">
                            This item is now officially yours.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Button
                        onClick={() => setShowClaimModal(true)}
                        variant="primary"
                        className="w-full text-lg py-4"
                      >
                        {item.type === "found"
                          ? "This Item is Mine!"
                          : "I Found This Item!"}
                      </Button>
                      {!user && (
                        <p className="text-center text-xs text-muted">
                          You must be logged in to claim.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MATCHES */}
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Sparkles className="text-accent" /> AI Matches
          </h2>
          {loadingMatches ? (
            <div className="text-center py-10 text-muted border border-white/5 rounded-xl">
              <Sparkles className="animate-spin mx-auto mb-2" size={24} />
              <p>Scanning for matches...</p>
            </div>
          ) : matches.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className="bg-surface rounded-xl p-4 border border-accent/20 hover:border-accent/40 transition-all flex gap-4"
                >
                  <img
                    src={match.item.image_url}
                    className="w-24 h-24 rounded-lg object-cover bg-black"
                  />
                  <div>
                    <h3 className="font-bold">{match.item.description}</h3>
                    <span className="text-xs bg-accent text-black px-2 py-0.5 rounded-full font-bold">
                      {match.confidence}% Match
                    </span>
                    <p className="text-xs text-muted mt-2 italic">
                      "{match.reasoning}"
                    </p>
                    <Link
                      to={`/item/${match.item.id}`}
                      className="text-accent text-sm hover:underline mt-1 block"
                    >
                      View Item
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-surface rounded-xl border border-white/5">
              <p className="text-muted mb-2">No AI matches found yet.</p>
              <p className="text-xs text-muted">
                We will automatically notify you if a matching item is reported!
              </p>
            </div>
          )}
        </div>

        {/* MODALS */}
        {showClaimModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-surface p-6 rounded-2xl w-full max-w-md border border-white/10">
              <h2 className="text-xl font-bold mb-4">
                {item.type === "found" ? "Claim Ownership" : "Report Finding"}
              </h2>

              <textarea
                className="w-full bg-background border border-white/10 rounded-xl p-3 h-32 outline-none focus:border-accent"
                placeholder={
                  item.type === "found"
                    ? "Describe proof of ownership (e.g., unique scratch, contents)..."
                    : "Where did you find it? Please provide details to help the owner verify."
                }
                value={claimMessage}
                onChange={(e) => setClaimMessage(e.target.value)}
              />

              <div className="flex justify-end mb-4">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setClaimMessage("✨ Gemini is thinking...");
                      const res = await api.post("/gemini/draft-message", {
                        item_type: item.type,
                        item_desc: item.description,
                      });
                      setClaimMessage(res.data.message);
                    } catch (e) {
                      console.error("Gemini Error:", e);
                      const errMsg =
                        e.response?.data?.error || e.message || "Unknown Error";
                      setClaimMessage(`Error: ${errMsg}`);
                      // Optional: Alert the user too so they see it
                      alert(`Gemini Error: ${errMsg}`);
                    }
                  }}
                  className="text-xs flex items-center gap-1 text-accent hover:text-white transition-colors font-bold"
                >
                  <Sparkles size={12} /> Auto-Write with Gemini
                </button>
              </div>

              <div className="flex gap-3">
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
                    className="w-full bg-background border border-white/10 rounded-lg p-2"
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
                    className="w-full bg-background border border-white/10 rounded-lg p-2"
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
