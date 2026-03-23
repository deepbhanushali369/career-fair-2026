"use client";

import { useState } from "react";
import CandidatePortal from "@/components/CandidatePortal";
import AdminDashboard from "@/components/AdminDashboard";

export default function Home() {
  const [mode, setMode] = useState(null); // null, "candidate", "admin", "admin-login"
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminError, setAdminError] = useState("");

  // Admin credentials
  const ADMIN_USERNAME = "turajitha";
  const ADMIN_PASSWORD = "Bhulku@369";

  function handleAdminLogin(e) {
    e.preventDefault();
    if (adminUser === ADMIN_USERNAME && adminPass === ADMIN_PASSWORD) {
      setMode("admin");
      setAdminError("");
    } else {
      setAdminError("Invalid username or password. Try again.");
    }
  }

  if (mode === "candidate") {
    return <CandidatePortal />;
  }

  if (mode === "admin") {
    return <AdminDashboard onBack={() => setMode(null)} />;
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#0B1120", color: "#F8FAFC",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "24px", fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 8px 0" }}>
          🎯 Career Fair 2026
        </h1>
        <p style={{ color: "#94A3B8", fontSize: "15px", margin: 0 }}>
          Welcome! Choose your portal to continue.
        </p>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px",
        maxWidth: "440px", width: "100%",
      }}>
        {/* Candidate Button */}
        <button
          onClick={() => setMode("candidate")}
          style={{
            padding: "32px 24px", borderRadius: "20px",
            border: "1px solid rgba(59,130,246,0.2)", background: "rgba(59,130,246,0.08)",
            color: "#F8FAFC", cursor: "pointer", textAlign: "center", transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(59,130,246,0.15)";
            e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(59,130,246,0.08)";
            e.currentTarget.style.borderColor = "rgba(59,130,246,0.2)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>👤</div>
          <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "6px" }}>
            I&#39;m a Candidate
          </div>
          <div style={{ fontSize: "13px", color: "#94A3B8" }}>
            View your journey & scores
          </div>
        </button>

        {/* Admin Button */}
        <button
          onClick={() => setMode("admin-login")}
          style={{
            padding: "32px 24px", borderRadius: "20px",
            border: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.08)",
            color: "#F8FAFC", cursor: "pointer", textAlign: "center", transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(139,92,246,0.15)";
            e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(139,92,246,0.08)";
            e.currentTarget.style.borderColor = "rgba(139,92,246,0.2)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>⚡</div>
          <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "6px" }}>
            Admin Portal
          </div>
          <div style={{ fontSize: "13px", color: "#94A3B8" }}>
            Manage all stations
          </div>
        </button>
      </div>

      {/* Admin Login Modal */}
      {mode === "admin-login" && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 100, padding: "20px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setMode(null); }}
        >
          <div style={{
            background: "#1E293B", borderRadius: "20px",
            border: "1px solid rgba(255,255,255,0.1)", padding: "32px",
            maxWidth: "360px", width: "100%",
          }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px 0", textAlign: "center" }}>
              ⚡ Admin Login
            </h2>
            <p style={{ color: "#94A3B8", fontSize: "13px", textAlign: "center", margin: "0 0 24px 0" }}>
              Enter your credentials
            </p>
            <form onSubmit={handleAdminLogin}>
              <input
                type="text" value={adminUser} onChange={(e) => setAdminUser(e.target.value)}
                placeholder="Username" required
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: "10px", fontSize: "14px",
                  border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.3)",
                  color: "#F8FAFC", outline: "none", boxSizing: "border-box", marginBottom: "10px",
                }}
              />
              <input
                type="password" value={adminPass} onChange={(e) => setAdminPass(e.target.value)}
                placeholder="Password" required
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: "10px", fontSize: "14px",
                  border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.3)",
                  color: "#F8FAFC", outline: "none", boxSizing: "border-box", marginBottom: "16px",
                }}
              />
              <button type="submit" style={{
                width: "100%", padding: "12px", borderRadius: "10px", border: "none",
                background: "linear-gradient(135deg, #8B5CF6, #6366F1)", color: "#FFF",
                fontSize: "15px", fontWeight: 600, cursor: "pointer",
              }}>
                Login
              </button>
            </form>
            {adminError && (
              <p style={{ color: "#F87171", fontSize: "13px", marginTop: "12px", textAlign: "center" }}>
                {adminError}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}