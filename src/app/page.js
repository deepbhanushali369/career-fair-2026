"use client";

import { useState, useEffect } from "react";
import CandidatePortal from "@/components/CandidatePortal";
import AdminDashboard from "@/components/AdminDashboard";

// ── Countdown to March 28, 2026 ─────────────────────────────────────
function useCountdown() {
  const [time, setTime] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  useEffect(() => {
    const target = new Date("2026-03-28T10:00:00").getTime();
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      setTime({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

// ── Animated Number ──────────────────────────────────────────────────
function AnimNum({ value, label }) {
  return (
    <div style={{ textAlign: "center", minWidth: "60px" }}>
      <div style={{
        fontSize: "28px", fontWeight: 800, fontFamily: "'Outfit', sans-serif",
        background: "linear-gradient(135deg, #F59E0B, #F97316)", WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}>{String(value).padStart(2, "0")}</div>
      <div style={{ fontSize: "10px", color: "#64748B", textTransform: "uppercase", letterSpacing: "1.5px", marginTop: "2px" }}>{label}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════

export default function Home() {
  const [mode, setMode] = useState(null);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminError, setAdminError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const countdown = useCountdown();

  useEffect(() => { setLoaded(true); }, []);

  const ADMIN_USERNAME = "turajitha";
  const ADMIN_PASSWORD = "Bhulku@369";

  function handleAdminLogin(e) {
    e.preventDefault();
    if (adminUser === ADMIN_USERNAME && adminPass === ADMIN_PASSWORD) {
      setMode("admin");
      setAdminError("");
    } else {
      setAdminError("Invalid credentials. Try again.");
    }
  }

  if (mode === "candidate") return <CandidatePortal />;
  if (mode === "admin") return <AdminDashboard onBack={() => setMode(null)} />;
  if (mode === "interviewer") {
    // Placeholder — we'll build this next
    return (
      <div style={{ minHeight: "100vh", background: "#060B18", color: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎤</div>
          <h2 style={{ fontSize: "20px", fontWeight: 700 }}>Interviewer Portal</h2>
          <p style={{ color: "#64748B", margin: "8px 0 24px" }}>Coming soon</p>
          <button onClick={() => setMode(null)} style={{ padding: "10px 24px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#94A3B8", cursor: "pointer" }}>← Back</button>
        </div>
      </div>
    );
  }

  // ── Styles ──
  const glass = {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px",
  };

  const stats = [
    { num: "70+", label: "Candidates" },
    { num: "20+", label: "Companies" },
    { num: "15+", label: "Interviewers" },
    { num: "5", label: "Stages" },
  ];

  const portals = [
    {
      key: "candidate", icon: "🎯", title: "I'm a Candidate",
      sub: "View your journey & scores",
      gradient: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.08))",
      border: "rgba(59,130,246,0.25)", accent: "#60A5FA",
    },
    {
      key: "interviewer", icon: "🎤", title: "I'm an Interviewer",
      sub: "View your queue & score candidates",
      gradient: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.08))",
      border: "rgba(245,158,11,0.25)", accent: "#FBBF24",
    },
    {
      key: "admin-login", icon: "⚡", title: "I'm an Admin",
      sub: "Manage all stations & data",
      gradient: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(168,85,247,0.08))",
      border: "rgba(139,92,246,0.25)", accent: "#A78BFA",
    },
  ];

  return (
    <>
      {/* Google Fonts */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      <div style={{
        minHeight: "100vh",
        background: "#060B18",
        color: "#F8FAFC",
        fontFamily: "'DM Sans', sans-serif",
        overflow: "hidden",
        position: "relative",
      }}>

        {/* ── Background Glow Effects ── */}
        <div style={{
          position: "fixed", top: "-30%", left: "-20%", width: "60%", height: "60%",
          background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "fixed", bottom: "-20%", right: "-20%", width: "50%", height: "50%",
          background: "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: "480px", margin: "0 auto", padding: "24px 20px", position: "relative", zIndex: 1 }}>

          {/* ── Header ── */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: "32px",
            opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(-10px)",
            transition: "all 0.6s ease",
          }}>
            <div style={{ fontSize: "12px", color: "#475569", letterSpacing: "2px", textTransform: "uppercase", fontWeight: 600 }}>
              March 28, 2026
            </div>
            <div style={{
              padding: "4px 12px", borderRadius: "20px",
              background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
              fontSize: "11px", color: "#4ADE80", fontWeight: 600,
            }}>
              ● Live Event
            </div>
          </div>

          {/* ── Hero ── */}
          <div style={{
            textAlign: "center", marginBottom: "28px",
            opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s ease 0.1s",
          }}>
            <h1 style={{
              fontFamily: "'Outfit', sans-serif", fontSize: "36px", fontWeight: 900,
              lineHeight: 1.1, margin: "0 0 12px 0",
              background: "linear-gradient(135deg, #F8FAFC 30%, #94A3B8 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Career Fair 2026
            </h1>
            <p style={{
              fontSize: "15px", fontWeight: 500, margin: 0,
              background: "linear-gradient(90deg, #F59E0B, #F97316)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              letterSpacing: "0.5px",
            }}>
              Your Career, Accelerated.
            </p>
          </div>

          {/* ── Countdown ── */}
          <div style={{
            ...glass, padding: "18px 24px", marginBottom: "20px",
            display: "flex", justifyContent: "center", gap: "20px", alignItems: "center",
            opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s ease 0.2s",
          }}>
            {countdown.days === 0 && countdown.hours === 0 && countdown.mins === 0 && countdown.secs === 0 ? (
              <div style={{
                fontFamily: "'Outfit', sans-serif", fontSize: "20px", fontWeight: 800,
                background: "linear-gradient(135deg, #22C55E, #4ADE80)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                padding: "8px 0",
              }}>
                🚀 Event is Live!
              </div>
            ) : (
              <>
                <AnimNum value={countdown.days} label="Days" />
                <div style={{ color: "#334155", fontSize: "24px", fontWeight: 300, alignSelf: "flex-start", marginTop: "4px" }}>:</div>
                <AnimNum value={countdown.hours} label="Hours" />
                <div style={{ color: "#334155", fontSize: "24px", fontWeight: 300, alignSelf: "flex-start", marginTop: "4px" }}>:</div>
                <AnimNum value={countdown.mins} label="Mins" />
                <div style={{ color: "#334155", fontSize: "24px", fontWeight: 300, alignSelf: "flex-start", marginTop: "4px" }}>:</div>
                <AnimNum value={countdown.secs} label="Secs" />
              </>
            )}
          </div>

          {/* ── Stats Ticker ── */}
          <div style={{
            display: "flex", justifyContent: "space-between", marginBottom: "24px", padding: "0 8px",
            opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s ease 0.3s",
          }}>
            {stats.map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: "#F8FAFC" }}>{s.num}</div>
                <div style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.8px" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Portal Buttons ── */}
          <div style={{
            display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px",
            opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s ease 0.4s",
          }}>
            {portals.map((p) => (
              <button
                key={p.key}
                onClick={() => setMode(p.key)}
                style={{
                  width: "100%", padding: "20px 24px", borderRadius: "16px", cursor: "pointer",
                  background: p.gradient, border: `1px solid ${p.border}`,
                  backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                  color: "#F8FAFC", textAlign: "left",
                  display: "flex", alignItems: "center", gap: "16px",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = p.accent; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = p.border; }}
              >
                <div style={{
                  width: "48px", height: "48px", borderRadius: "14px",
                  background: `${p.accent}15`, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "24px", flexShrink: 0,
                }}>{p.icon}</div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>{p.title}</div>
                  <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>{p.sub}</div>
                </div>
                <div style={{ marginLeft: "auto", color: "#475569", fontSize: "20px" }}>›</div>
              </button>
            ))}
          </div>

          {/* ── Pro Tip ── */}
          <div style={{
            padding: "16px 20px", borderRadius: "12px",
            background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.1)",
            marginBottom: "32px",
            opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s ease 0.6s",
          }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#F59E0B", marginBottom: "4px" }}>
              🎯 Pro Tip
            </div>
            <div style={{ fontSize: "13px", color: "#94A3B8", lineHeight: 1.5 }}>
              Prepare your elevator pitch — 30 seconds about who you are, what you&#39;re studying, and what excites you about the role.
            </div>
          </div>

        </div>

        {/* ── Admin Login Modal ── */}
        {mode === "admin-login" && (
          <div
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 100, padding: "20px",
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setMode(null); }}
          >
            <div style={{
              ...glass, background: "rgba(15,23,42,0.95)", padding: "36px 32px",
              maxWidth: "380px", width: "100%",
            }}>
              <div style={{ textAlign: "center", marginBottom: "28px" }}>
                <div style={{
                  width: "56px", height: "56px", borderRadius: "16px", margin: "0 auto 16px",
                  background: "rgba(139,92,246,0.12)", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "28px",
                }}>⚡</div>
                <h2 style={{ fontSize: "22px", fontWeight: 800, margin: 0, fontFamily: "'Outfit', sans-serif" }}>Admin Access</h2>
                <p style={{ color: "#64748B", fontSize: "13px", margin: "6px 0 0" }}>Enter your credentials to continue</p>
              </div>
              <form onSubmit={handleAdminLogin}>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "12px", color: "#64748B", fontWeight: 500, display: "block", marginBottom: "6px" }}>Username</label>
                  <input
                    type="text" value={adminUser} onChange={(e) => setAdminUser(e.target.value)} required
                    style={{
                      width: "100%", padding: "12px 16px", borderRadius: "12px", fontSize: "14px",
                      border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)",
                      color: "#F8FAFC", outline: "none", boxSizing: "border-box",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => e.target.style.borderColor = "rgba(139,92,246,0.4)"}
                    onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                  />
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ fontSize: "12px", color: "#64748B", fontWeight: 500, display: "block", marginBottom: "6px" }}>Password</label>
                  <input
                    type="password" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} required
                    style={{
                      width: "100%", padding: "12px 16px", borderRadius: "12px", fontSize: "14px",
                      border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)",
                      color: "#F8FAFC", outline: "none", boxSizing: "border-box",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => e.target.style.borderColor = "rgba(139,92,246,0.4)"}
                    onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                  />
                </div>
                <button type="submit" style={{
                  width: "100%", padding: "14px", borderRadius: "12px", border: "none",
                  background: "linear-gradient(135deg, #8B5CF6, #6366F1)", color: "#FFF",
                  fontSize: "15px", fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                  transition: "opacity 0.2s",
                }}
                  onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                  onMouseLeave={(e) => e.target.style.opacity = "1"}
                >
                  Login →
                </button>
              </form>
              {adminError && (
                <p style={{ color: "#F87171", fontSize: "13px", marginTop: "14px", textAlign: "center" }}>{adminError}</p>
              )}
              <button onClick={() => setMode(null)} style={{
                width: "100%", marginTop: "12px", padding: "10px", borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.06)", background: "transparent",
                color: "#64748B", cursor: "pointer", fontSize: "13px",
              }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}