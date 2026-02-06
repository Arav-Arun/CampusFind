import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import Button from "../components/Button";

import { User, Mail, Lock, AlertCircle, Phone } from "lucide-react";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";
import api from "../api";

const Signup = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    if (!passwordRegex.test(password)) {
      setError(
        "Password must contain 6+ chars, 1 uppercase, 1 number, and 1 special char."
      );
      setLoading(false);
      return;
    }

    const res = await register(name, email, password, phone);
    if (res.success) {
      navigate("/login"); // Redirect to login after signup
    } else {
      setError(res.error);
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();

      // Send token to backend
      const res = await api.post("/auth/google", { token });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      window.location.href = "/";
    } catch (err) {
      console.error(err);
      if (
        err.code === "auth/configuration-not-found" ||
        err.message?.includes("configuration-not-found")
      ) {
        setError(
          "Error: Google Sign-In is disabled in your Firebase Console. Please enable it in Authentication > Sign-in method."
        );
      } else {
        setError("Google Sign In failed: " + err.message);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center pt-16 px-4">
      <div className="bg-surface p-8 rounded-2xl w-full max-w-md border border-white/10 shadow-xl">
        <h2 className="text-3xl font-bold mb-2 text-center">Create Account</h2>
        <p className="text-muted text-center mb-8">Join CampusFind today</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg flex items-center gap-2 mb-6">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          type="button"
          className="w-full bg-white text-black py-3 rounded-xl font-bold mb-6 flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
        >
          <img src="/google.svg" className="w-5 h-5" alt="Google" />
          Sign up with Google
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-surface px-2 text-muted">
              Or continue with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-4 top-3.5 text-muted" size={20} />
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background border-none rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-accent outline-none transition-all placeholder:text-muted/50"
              required
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-4 top-3.5 text-muted" size={20} />
            <input
              type="tel"
              placeholder="Mobile Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-background border-none rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-accent outline-none transition-all placeholder:text-muted/50"
              required
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 text-muted" size={20} />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background border-none rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-accent outline-none transition-all placeholder:text-muted/50"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 text-muted" size={20} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border-none rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-accent outline-none transition-all placeholder:text-muted/50"
              required
              autoComplete="new-password"
            />
            <p className="text-[10px] text-muted mt-1 ml-2">
              Must contain 6+ chars, 1 uppercase, 1 number, 1 special char.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full !py-3.5 mt-2"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link to="/login" className="text-accent hover:underline">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
