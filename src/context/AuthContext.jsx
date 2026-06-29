import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  const init = async () => {
    const token = localStorage.getItem("token");

    if (token) {
      await fetchUser();
    }

    setLoading(false); 
  };

  init();
}, []);

 const login = async (email, password) => {
  try {
    const res = await api.post("/api/auth/login", { email, password });

    const { token } = res.data;
    localStorage.setItem("token", token);

    
    const userRes = await api.get("/api/user/me");

    setUser(userRes.data);
    localStorage.setItem("user", JSON.stringify(userRes.data));

    return { success: true };

  } catch (err) {
    console.error("Login Error:", err);
    return {
      success: false,
      error: err.response?.data?.message || "Login failed",
    };
  }
};


  const register = async (form) => {
    try {
    
      await api.post("/api/auth/register", form);
      return { success: true };
    } catch (err) {
      console.error("Register Error:", err);
      return {
        success: false,
        error: err.response?.data?.message || "Register failed",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };


  const fetchUser = async () => {
  try {
    const res = await api.get("/api/user/me");

    setUser(res.data);
    localStorage.setItem("user", JSON.stringify(res.data));

  } catch (err) {
    console.error("Fetch user failed", err);
    logout();
  }
};

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p style={{ marginTop: '16px', fontFamily: 'sans-serif', color: '#666' }}>Connecting to backend (may take up to 50s on free tier)...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};