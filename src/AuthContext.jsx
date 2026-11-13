import React, { createContext, useState, useContext, useEffect } from "react";
import api from "./api";

const AuthContext = createContext(null);

const errorMessage = (error, fallback) => error.response?.data?.error || fallback;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem("token")));

  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    api
      .get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch((error) => {
        if (error.response?.status === 401) localStorage.removeItem("token");
      })
      .finally(() => setLoading(false));
  }, []);

  const startSession = ({ token, user }) => {
    localStorage.setItem("token", token);
    setUser(user);
  };

  const attempt = (fallback, run) =>
    run().then(
      () => ({ success: true }),
      (error) => ({ success: false, error: errorMessage(error, fallback) })
    );

  const login = (email, password) =>
    attempt("Login failed", async () => startSession((await api.post("/auth/login", { email, password })).data));

  const googleLogin = (idToken) =>
    attempt("Google sign-in failed", async () => startSession((await api.post("/auth/google", { token: idToken })).data));

  const register = (name, email, password, phone) =>
    attempt("Registration failed", () => api.post("/auth/register", { name, email, password, phone }));

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, googleLogin, register, logout, updateUser: setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
