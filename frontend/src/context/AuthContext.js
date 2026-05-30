import { createContext, useContext, useState, useCallback, useEffect } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("trade_token") || "");
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("trade_user") || "null"); } catch { return null; }
  });
  const [bootstrapping, setBootstrapping] = useState(!!localStorage.getItem("trade_token"));

  // Refresh user from server on mount if we have a token
  useEffect(() => {
    if (!token) { setBootstrapping(false); return; }
    api.get("/auth/me")
      .then(({ data }) => {
        setUser(data);
        localStorage.setItem("trade_user", JSON.stringify(data));
      })
      .catch(() => { /* api interceptor handles 401 */ })
      .finally(() => setBootstrapping(false));
  // eslint-disable-next-line
  }, []);

  const login = useCallback((tk, u) => {
    localStorage.setItem("trade_token", tk);
    localStorage.setItem("trade_user", JSON.stringify(u));
    setToken(tk);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("trade_token");
    localStorage.removeItem("trade_user");
    setToken("");
    setUser(null);
  }, []);

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider value={{ token, user, isAdmin, login, logout, bootstrapping }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
