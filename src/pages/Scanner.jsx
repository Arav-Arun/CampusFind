import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, ArrowLeft } from "lucide-react";
import api from "../api";
import Button from "../components/Button";

const Scanner = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/claims/verify", { token: code });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "That code didn't work. Check it and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft size={16} /> Back
      </button>

      {result ? (
        <div className="panel p-8 text-center">
          <CheckCircle size={44} className="mx-auto text-found" />
          <h1 className="mt-4 text-2xl font-bold">Handoff confirmed</h1>
          <p className="mt-2 text-muted">“{result.item_title}” is marked as returned.</p>
          <p className="mt-6 text-sm">
            {result.rewarded_user === "You" ? "You earned" : `${result.rewarded_user} earned`}{" "}
            <span className="font-semibold">{result.finder_bonus} trust points</span> for returning it.
          </p>
          <Button onClick={() => navigate("/")} className="mt-8 w-full">
            Back to browsing
          </Button>
        </div>
      ) : (
        <form onSubmit={handleVerify} className="panel p-8">
          <h1 className="text-2xl font-bold">Confirm a handoff</h1>
          <p className="mt-2 text-sm text-muted">
            When you meet, ask the claimant for the 6-digit code on their ticket and type it here.
          </p>

          <label htmlFor="handoff-code" className="sr-only">
            Handoff code
          </label>
          <input
            id="handoff-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="ticket-code mt-6 w-full py-5 text-center text-4xl"
            placeholder="000000"
            autoFocus
          />

          {error && (
            <p className="mt-3 text-sm text-lost" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="mt-6 w-full py-3 text-base" disabled={code.length !== 6 || loading}>
            {loading ? "Checking..." : "Confirm handoff"}
          </Button>
        </form>
      )}
    </div>
  );
};

export default Scanner;
