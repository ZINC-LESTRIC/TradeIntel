import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("trade_token") || "");

  const login = useCallback((tk) => {
    localStorage.setItem("trade_token", tk);
    setToken(tk);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("trade_token");
    setToken("");
  }, []);

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
