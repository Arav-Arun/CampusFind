import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../api";
import { CheckCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import Button from "../components/Button";

const Scanner = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (code.length < 6) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/claims/verify", { token: code });
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.error || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto py-10 px-4">
        <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </Button>

        <div className="bg-surface border border-white/10 rounded-2xl p-6 shadow-2xl min-h-[400px] flex flex-col justify-center">
          {!result ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-2xl font-bold text-center mb-2">
                Verify Handoff
              </h1>
              <p className="text-muted text-center text-sm mb-8">
                Enter the 6-digit code shown on the claimant's screen.
              </p>

              <form onSubmit={handleVerify}>
                <div className="flex justify-center mb-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    className="w-full text-center text-5xl tracking-[0.2em] font-bold bg-black/50 border-2 border-accent/30 rounded-2xl py-8 focus:border-accent outline-none transition-all placeholder:tracking-normal placeholder:text-muted/10 text-white"
                    placeholder="000000"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm animate-in shake">
                    <AlertTriangle size={20} className="shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full mt-8 !py-4 text-lg font-bold shadow-lg shadow-accent/20"
                  disabled={code.length !== 6 || loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2 justify-center">
                      <span className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full"></span>
                      Verifying...
                    </span>
                  ) : (
                    "Verify & Complete"
                  )}
                </Button>
              </form>
            </div>
          ) : (
            <div className="text-center py-6 animate-in fade-in zoom-in duration-500">
              <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(34,197,94,0.4)]">
                <CheckCircle size={56} />
              </div>
              <h2 className="text-3xl font-bold text-green-400 mb-2">
                Verified!
              </h2>
              <p className="text-lg font-bold mb-1 text-white">
                {result.item_title}
              </p>
              <p className="text-muted mb-8">{result.message}</p>

              <div className="bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 p-6 rounded-2xl mb-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-accent/10 blur-xl"></div>
                <div className="relative">
                  <p className="text-sm uppercase tracking-wide font-bold text-accent mb-2">
                    {result.rewarded_user === "You"
                      ? "Trust Score Bonus"
                      : `Points Awarded to ${result.rewarded_user}`}
                  </p>
                  <p className="text-5xl font-black text-accent drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                    +{result.finder_bonus}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => navigate("/")}
                variant="primary"
                className="w-full !py-4 text-lg"
              >
                Back to Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Scanner;
