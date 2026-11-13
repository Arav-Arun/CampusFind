import React, { useState, useId } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { User, Mail, Lock, Phone, AlertCircle } from "lucide-react";
import Button from "../components/Button";
import { useAuth } from "../AuthContext";
import { auth, googleProvider } from "../firebase";

// 6+ chars, 1 uppercase, 1 number, 1 special character (mirrors the server rule)
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
const PASSWORD_HINT = "At least 6 characters, with an uppercase letter, a number and one of @$!%*?&.";

const Field = ({ icon: Icon, label, ...props }) => {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input id={id} className="w-full py-2.5 pl-10" required {...props} />
      </div>
    </div>
  );
};

/** Sign in / sign up page. `mode` is "login" or "signup". */
const Auth = ({ mode }) => {
  const isSignup = mode === "signup";
  const { login, register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const run = async (action) => {
    setError("");
    setLoading(true);
    const result = await action();
    setLoading(false);
    if (result.success) navigate("/");
    else if (result.error) setError(result.error);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    run(async () => {
      if (!isSignup) return login(form.email, form.password);
      if (!PASSWORD_RE.test(form.password)) return { error: `Choose a stronger password: ${PASSWORD_HINT.toLowerCase()}` };

      const created = await register(form.name, form.email, form.password, form.phone);
      return created.success ? login(form.email, form.password) : created;
    });
  };

  const handleGoogle = () =>
    run(async () => {
      try {
        const popup = await signInWithPopup(auth, googleProvider);
        return googleLogin(await popup.user.getIdToken());
      } catch (err) {
        if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") return {};
        if (err.code === "auth/configuration-not-found") {
          return { error: "Google Sign-In is disabled in the Firebase Console (Authentication > Sign-in method)." };
        }
        return { error: "Google sign-in failed: " + err.message };
      }
    });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link to="/" className="mb-8 flex items-center gap-2">
        <img src="/logo.png" alt="" className="h-9 w-9 rounded-md object-contain" />
        <span className="text-xl font-bold" style={{ fontStretch: "118%" }}>
          CampusFind
        </span>
      </Link>

      <div className="panel w-full max-w-sm p-6 sm:p-8">
        <h1 className="text-2xl font-bold">{isSignup ? "Create your account" : "Sign in"}</h1>
        <p className="mt-1 text-sm text-muted">
          {isSignup ? "Report items and claim what's yours." : "Welcome back. Pick up where you left off."}
        </p>

        {error && (
          <div className="mt-5 flex items-start gap-2 rounded-lg border border-lost/30 bg-lost/5 p-3 text-sm text-lost" role="alert">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleGoogle}
          disabled={loading}
          type="button"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface py-2.5 text-sm font-medium transition-colors hover:bg-subtle disabled:opacity-50"
        >
          <img src="/google.svg" className="h-4 w-4" alt="" />
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" />
          or with email
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <>
              <Field icon={User} label="Name" type="text" autoComplete="name" value={form.name} onChange={set("name")} />
              <Field icon={Phone} label="Phone" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} />
            </>
          )}
          <Field icon={Mail} label="Email" type="email" autoComplete="email" value={form.email} onChange={set("email")} />
          <div>
            <Field
              icon={Lock}
              label="Password"
              type="password"
              value={form.password}
              onChange={set("password")}
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
            {isSignup && <p className="mt-1 text-xs text-muted">{PASSWORD_HINT}</p>}
          </div>

          <Button type="submit" className="w-full py-2.5" disabled={loading}>
            {loading ? "Please wait..." : isSignup ? "Create account" : "Sign in"}
          </Button>
        </form>
      </div>

      <p className="mt-6 text-sm text-muted">
        {isSignup ? "Already have an account? " : "New here? "}
        <Link to={isSignup ? "/login" : "/signup"} className="font-medium text-accent underline underline-offset-2">
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
};

export default Auth;
