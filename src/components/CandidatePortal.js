"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Constants ────────────────────────────────────────────────────────
const SCORE_LABELS = { 5: "Excellent", 4: "Great", 3: "Good", 2: "Fair", 1: "Needs Improvement" };
const SCORE_COLORS = { 5: "#22C55E", 4: "#3B82F6", 3: "#EAB308", 2: "#F97316", 1: "#EF4444" };
const STATUS_COLORS = { Completed: "#22C55E", "In Progress": "#3B82F6", Pending: "#64748B" };

const STATIONS = [
  { key: "oa", label: "Online Assessment", icon: "📝", checkinAction: "checkin-oa", accent: "#F59E0B", accentBg: "rgba(245,158,11,0.12)" },
  { key: "interview", label: "Technical Interview", icon: "💻", checkinAction: "checkin-interview", accent: "#3B82F6", accentBg: "rgba(59,130,246,0.12)" },
  { key: "behavioral", label: "Behavioural Interview", icon: "🗣️", checkinAction: "checkin-behavioral", accent: "#EC4899", accentBg: "rgba(236,72,153,0.12)" },
  { key: "resume", label: "Resume / LinkedIn Review", icon: "📄", checkinAction: "checkin-resume", accent: "#14B8A6", accentBg: "rgba(20,184,166,0.12)" },
  { key: "ppt", label: "PPT Presentation", icon: "📊", checkinAction: "checkin-ppt", accent: "#F97316", accentBg: "rgba(249,115,22,0.12)" },
];

// ── Shared Glass Style ───────────────────────────────────────────────
const glass = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "20px",
};

// ── Helpers ──────────────────────────────────────────────────────────
function getScore(data) {
  if (!data) return null;
  const val = data.score || data.techScore || data.pptScore;
  return val ? parseInt(val) : null;
}
function getFeedback(data) {
  if (!data) return null;
  return data.feedback || data.techFeedback || data.pptFeedback || data.notes || null;
}

// ══════════════════════════════════════════════════════════════════════
// INFO CARD
// ══════════════════════════════════════════════════════════════════════
function InfoCard({ icon, label, value }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px",
      background: "rgba(255,255,255,0.03)", borderRadius: "12px",
      border: "1px solid rgba(255,255,255,0.06)", padding: "14px 16px",
    }}>
      <span style={{ fontSize: "18px" }}>{icon}</span>
      <div>
        <div style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#F8FAFC", marginTop: "2px" }}>{value}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// EXHIBITOR CARD
// ══════════════════════════════════════════════════════════════════════
function getHeadshotUrl(url) {
  if (!url) return null;
  let match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) return `https://lh3.googleusercontent.com/d/${match[1]}`;
  return null;
}

function ExhibitorCard({ person }) {
  const initials = `${(person.firstName || "")[0] || ""}${(person.lastName || "")[0] || ""}`.toUpperCase();
  const photoUrl = getHeadshotUrl(person.headshot);
  return (
    <div style={{
      ...glass, padding: "20px",
      display: "flex", gap: "14px", alignItems: "flex-start",
    }}>
      {/* Avatar — photo or initials fallback */}
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={`${person.firstName} ${person.lastName}`}
          referrerPolicy="no-referrer"
          style={{
            width: "48px", height: "48px", borderRadius: "12px", flexShrink: 0,
            objectFit: "cover",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
          onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
        />
      ) : null}
      <div style={{
        width: "48px", height: "48px", borderRadius: "12px", flexShrink: 0,
        background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.15))",
        border: "1px solid rgba(59,130,246,0.15)",
        display: photoUrl ? "none" : "flex", alignItems: "center", justifyContent: "center",
        fontSize: "15px", fontWeight: 700, fontFamily: "'Outfit', sans-serif",
        color: "#60A5FA",
      }}>
        {initials}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "15px", fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: "#F8FAFC" }}>
          {person.firstName} {person.lastName}
        </div>
        <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "3px" }}>
          {person.position}
        </div>
        <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
          {person.company}
        </div>

        {/* LinkedIn link */}
        {person.linkedin && (
          <a
            href={person.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              marginTop: "10px", padding: "5px 12px", borderRadius: "8px",
              background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.15)",
              color: "#60A5FA", fontSize: "11px", fontWeight: 600,
              textDecoration: "none", letterSpacing: "0.3px",
            }}
          >
            🔗 LinkedIn
          </a>
        )}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
export default function CandidatePortal() {
  const [email, setEmail] = useState("");
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeStation, setActiveStation] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("journey"); // "journey" | "panel"
  const [exhibitors, setExhibitors] = useState([]);
  const [exhibitorsLoading, setExhibitorsLoading] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => { setLoaded(true); }, []);

  // ── Fetch journey data ──
  const fetchJourney = useCallback(async (em, silent = false) => {
    const target = em || email;
    if (!target) return;
    if (!silent) setLoading(true);
    if (!silent) setError("");
    try {
      const res = await fetch(`/api/sheets?action=journey&email=${encodeURIComponent(target.trim())}`);
      if (!res.ok) {
        if (!silent) { setError("Email not found. Please check and try again."); setJourney(null); }
        return;
      }
      const data = await res.json();
      setJourney(data);
    } catch {
      if (!silent) setError("Something went wrong. Try again.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [email]);

  // ── Auto-poll every 30 seconds after login ──
  useEffect(() => {
    if (!journey?.email) return;
    pollRef.current = setInterval(() => {
      fetchJourney(journey.email, true); // silent refresh
    }, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [journey?.email, fetchJourney]);

  // ── Fetch exhibitors when panel tab is opened ──
  useEffect(() => {
    if (activeTab === "panel" && exhibitors.length === 0 && !exhibitorsLoading) {
      setExhibitorsLoading(true);
      fetch("/api/sheets?action=exhibitors")
        .then((r) => r.json())
        .then((data) => setExhibitors(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setExhibitorsLoading(false));
    }
  }, [activeTab, exhibitors.length, exhibitorsLoading]);

  // ── Check in to a station ──
  async function handleCheckin(station) {
    if (!journey || checkingIn) return;
    setCheckingIn(true);
    try {
      const res = await fetch("/api/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: station.checkinAction,
          email: journey.email,
          name: journey.name,
          domain: journey.domain,
        }),
      });
      if (res.ok) await fetchJourney(journey.email);
    } catch { /* silent */ }
    finally { setCheckingIn(false); }
  }

  function handleLogin(e) {
    e.preventDefault();
    if (!email.trim()) return;
    fetchJourney(email.trim());
  }

  function handleLogout() {
    if (pollRef.current) clearInterval(pollRef.current);
    setJourney(null);
    setEmail("");
    setError("");
    setActiveStation(null);
    setActiveTab("journey");
    setExhibitors([]);
  }

  // ══════════════════════════════════════════════════════════════════
  // FONTS + BG WRAPPER (reused across all screens)
  // ══════════════════════════════════════════════════════════════════
  const Wrapper = ({ children }) => (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <div style={{
        minHeight: "100vh", background: "#060B18", color: "#F8FAFC",
        fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden",
      }}>
        {/* Background glows */}
        <div style={{ position: "fixed", top: "-30%", left: "-20%", width: "60%", height: "60%", background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "fixed", bottom: "-20%", right: "-20%", width: "50%", height: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
        {children}
      </div>
      <style>{`@keyframes cpspin { to { transform: rotate(360deg); } }`}</style>
    </>
  );

  // ══════════════════════════════════════════════════════════════════
  // LOGIN SCREEN
  // ══════════════════════════════════════════════════════════════════
  if (!journey) {
    return (
      <Wrapper>
        <div style={{
          maxWidth: "420px", margin: "0 auto", padding: "24px 20px",
          position: "relative", zIndex: 1,
          display: "flex", flexDirection: "column", minHeight: "100vh",
          justifyContent: "center",
        }}>
          {/* Back button */}
          <div style={{
            position: "absolute", top: "24px", left: "20px",
            opacity: loaded ? 1 : 0, transform: loaded ? "translateX(0)" : "translateX(-10px)",
            transition: "all 0.5s ease",
          }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#64748B", padding: "8px 14px", borderRadius: "10px", cursor: "pointer",
                fontSize: "13px", display: "flex", alignItems: "center", gap: "6px",
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "#94A3B8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#64748B"; }}
            >
              ← Back
            </button>
          </div>

          {/* Hero */}
          <div style={{
            textAlign: "center", marginBottom: "36px",
            opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s ease 0.1s",
          }}>
            <div style={{
              width: "64px", height: "64px", borderRadius: "18px", margin: "0 auto 20px",
              background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.08))",
              border: "1px solid rgba(59,130,246,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px",
            }}>🎯</div>
            <h1 style={{
              fontFamily: "'Outfit', sans-serif", fontSize: "28px", fontWeight: 800,
              lineHeight: 1.2, margin: "0 0 10px 0",
              background: "linear-gradient(135deg, #F8FAFC 30%, #94A3B8 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Welcome, Candidate</h1>
            <p style={{ fontSize: "14px", color: "#64748B", margin: 0, lineHeight: 1.5 }}>
              Enter your registered email to view<br />your career fair journey
            </p>
          </div>

          {/* Login Card */}
          <div style={{
            ...glass, padding: "32px 28px",
            opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s ease 0.25s",
          }}>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "12px", color: "#64748B", fontWeight: 500, display: "block", marginBottom: "8px", letterSpacing: "0.3px" }}>
                  Your Email
                </label>
                <input
                  type="email" value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="name@example.com" required autoFocus
                  style={{
                    width: "100%", padding: "14px 16px", borderRadius: "12px",
                    fontSize: "15px", fontFamily: "'DM Sans', sans-serif",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(0,0,0,0.3)", color: "#F8FAFC",
                    outline: "none", boxSizing: "border-box", transition: "border-color 0.2s ease",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "rgba(59,130,246,0.4)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                />
              </div>
              <button type="submit" disabled={loading} style={{
                width: "100%", padding: "14px", borderRadius: "12px", border: "none",
                background: loading ? "rgba(59,130,246,0.3)" : "linear-gradient(135deg, #3B82F6, #6366F1)",
                color: "#FFF", fontSize: "15px", fontWeight: 700,
                fontFamily: "'Outfit', sans-serif", cursor: loading ? "wait" : "pointer",
                transition: "all 0.2s ease",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}>
                {loading ? (
                  <><span style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "cpspin 0.6s linear infinite" }} />Finding you...</>
                ) : "Enter the Fair →"}
              </button>
            </form>
            {error && (
              <div style={{
                marginTop: "16px", padding: "12px 16px", borderRadius: "10px",
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)",
                fontSize: "13px", color: "#F87171", textAlign: "center", lineHeight: 1.5,
              }}>{error}</div>
            )}
          </div>

          {/* Hint */}
          <div style={{
            marginTop: "20px", textAlign: "center",
            opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s ease 0.4s",
          }}>
            <p style={{ fontSize: "12px", color: "#475569", lineHeight: 1.6 }}>
              Use the email you registered with on the Google Form.
              <br />Can&#39;t find yours? Visit the <span style={{ color: "#60A5FA" }}>Front Desk</span>.
            </p>
          </div>

          {/* Event strip */}
          <div style={{
            marginTop: "32px", display: "flex", justifyContent: "center", gap: "24px",
            opacity: loaded ? 1 : 0, transition: "all 0.8s ease 0.55s",
          }}>
            {[{ icon: "🕤", text: "9:30 AM" }, { icon: "📅", text: "Mar 28, 2026" }].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#475569" }}>
                <span>{item.icon}</span><span>{item.text}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#475569" }}>
              <span>📍</span><span>2731 Washington St, Roxbury</span>
            </div>
          </div>
        </div>
      </Wrapper>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // STATION DETAIL VIEW
  // ══════════════════════════════════════════════════════════════════
  if (activeStation) {
    const st = STATIONS.find((s) => s.key === activeStation);
    const status = journey.statuses[st.key];
    const data = journey[st.key];
    const score = data ? getScore(data) : null;
    const feedback = data ? getFeedback(data) : null;

    return (
      <Wrapper>
        <div style={{ maxWidth: "480px", margin: "0 auto", padding: "20px", position: "relative", zIndex: 1 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
            <button onClick={() => setActiveStation(null)} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#94A3B8", padding: "10px 14px", borderRadius: "10px", cursor: "pointer",
              fontSize: "13px", fontFamily: "'DM Sans', sans-serif",
            }}>←</button>
            <div>
              <div style={{ fontSize: "18px", fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>
                {st.icon} {st.label}
              </div>
              <div style={{ fontSize: "12px", fontWeight: 600, marginTop: "4px", color: STATUS_COLORS[status] || "#64748B" }}>
                {status}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Pending */}
            {status === "Pending" && (
              <div style={{ ...glass, padding: "28px", textAlign: "center" }}>
                <div style={{ fontSize: "40px", marginBottom: "16px", opacity: 0.6 }}>⏳</div>
                <div style={{ fontSize: "16px", fontWeight: 600, fontFamily: "'Outfit', sans-serif", marginBottom: "8px" }}>
                  Not Started Yet
                </div>
                <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 20px", lineHeight: 1.5 }}>
                  Tap below when you arrive at this station.
                </p>
                <button onClick={() => handleCheckin(st)} disabled={checkingIn} style={{
                  width: "100%", padding: "14px", borderRadius: "12px", border: "none",
                  background: checkingIn ? "rgba(255,255,255,0.1)" : `linear-gradient(135deg, ${st.accent}, ${st.accent}CC)`,
                  color: "#FFF", fontSize: "15px", fontWeight: 700,
                  fontFamily: "'Outfit', sans-serif", cursor: checkingIn ? "wait" : "pointer",
                  transition: "all 0.2s ease",
                }}>
                  {checkingIn ? "Checking in..." : "Check In →"}
                </button>
              </div>
            )}

            {/* In Progress */}
            {status === "In Progress" && (
              <div style={{ ...glass, padding: "28px", textAlign: "center" }}>
                <div style={{
                  width: "48px", height: "48px", borderRadius: "50%", margin: "0 auto 16px",
                  background: "rgba(59,130,246,0.12)", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "22px",
                }}>◉</div>
                <div style={{ fontSize: "16px", fontWeight: 600, fontFamily: "'Outfit', sans-serif", marginBottom: "6px" }}>
                  In Progress
                </div>
                <p style={{ fontSize: "13px", color: "#64748B", margin: 0, lineHeight: 1.5 }}>
                  You&#39;re checked in. Scores will appear here once submitted.
                </p>
              </div>
            )}

            {/* Completed */}
            {status === "Completed" && score && (
              <div style={{
                ...glass, padding: "28px", textAlign: "center",
                borderColor: "rgba(34,197,94,0.15)", background: "rgba(34,197,94,0.04)",
              }}>
                <div style={{
                  fontSize: "48px", fontWeight: 900, fontFamily: "'Outfit', sans-serif",
                  color: SCORE_COLORS[score] || "#F8FAFC", marginBottom: "6px",
                }}>
                  {score}<span style={{ fontSize: "20px", color: "#475569" }}>/5</span>
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: SCORE_COLORS[score] || "#94A3B8" }}>
                  {SCORE_LABELS[score] || "Scored"}
                </div>
              </div>
            )}

            {/* Interview details */}
            {activeStation === "interview" && data && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <InfoCard icon="👤" label="Interviewer" value={data.interviewer || "—"} />
                <InfoCard icon="🕐" label="Time Slot" value={data.timeSlot || "—"} />
                <InfoCard icon="📍" label="Room" value={data.room || "—"} />
              </div>
            )}
            {activeStation === "behavioral" && data && data.room && (
              <InfoCard icon="📍" label="Room" value={data.room} />
            )}

            {/* Feedback */}
            {feedback && (
              <div style={{ ...glass, padding: "20px" }}>
                <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Feedback
                </div>
                <div style={{ fontSize: "14px", lineHeight: 1.7, color: "#CBD5E1" }}>{feedback}</div>
              </div>
            )}
          </div>

          {/* Refresh */}
          <button onClick={() => fetchJourney(journey.email)} style={{
            width: "100%", marginTop: "24px", padding: "14px", fontSize: "13px", fontWeight: 500,
            borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)", color: "#64748B", cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s ease",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "#94A3B8"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#64748B"; }}
          >
            🔄 Refresh Status
          </button>
        </div>
      </Wrapper>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // HUB SCREEN (Journey Dashboard + My Network)
  // ══════════════════════════════════════════════════════════════════
  const completedCount = journey.completedCount || 0;
  const progressPct = (completedCount / 5) * 100;
  const firstName = journey.name?.split(" ")[0] || "Candidate";
  const isFrontDeskCheckedIn = journey.frontDeskCheckedIn;

  return (
    <Wrapper>
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "20px", position: "relative", zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 4px 0", fontFamily: "'Outfit', sans-serif" }}>
              Hey, {firstName} 👋
            </h1>
            <p style={{ color: "#64748B", fontSize: "13px", margin: 0 }}>
              {journey.jobRole || journey.domain || "Candidate"}
            </p>
          </div>
          <button onClick={handleLogout} style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: "#64748B", padding: "8px 14px", borderRadius: "10px", cursor: "pointer",
            fontSize: "12px", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s ease",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
          >Logout</button>
        </div>

        {/* ── Tab Switcher ── */}
        <div style={{
          display: "flex", gap: "4px", marginBottom: "20px", padding: "4px",
          background: "rgba(255,255,255,0.04)", borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          {[
            { key: "journey", label: "My Journey" },
            { key: "panel", label: "My Network" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: "10px 0", borderRadius: "9px", border: "none",
                fontSize: "13px", fontWeight: 600, fontFamily: "'Outfit', sans-serif",
                cursor: "pointer", transition: "all 0.2s ease",
                background: activeTab === tab.key ? "rgba(255,255,255,0.08)" : "transparent",
                color: activeTab === tab.key ? "#F8FAFC" : "#64748B",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* MY JOURNEY TAB                                           */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === "journey" && (
          <>
            {/* ── Front Desk Gate ── */}
            {!isFrontDeskCheckedIn && (
              <div style={{
                ...glass, padding: "28px", textAlign: "center", marginBottom: "20px",
                borderColor: "rgba(245,158,11,0.15)", background: "rgba(245,158,11,0.04)",
              }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>🚪</div>
                <div style={{
                  fontSize: "17px", fontWeight: 700, fontFamily: "'Outfit', sans-serif",
                  marginBottom: "8px",
                  background: "linear-gradient(135deg, #F59E0B, #F97316)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>
                  Check In at the Front Desk
                </div>
                <p style={{ fontSize: "13px", color: "#94A3B8", margin: 0, lineHeight: 1.6 }}>
                  Visit the registration counter to get checked in.<br />
                  Once done, all stations will unlock here.
                </p>

              </div>
            )}

            {/* ── Progress Card (only if checked in) ── */}
            {isFrontDeskCheckedIn && (
              <div style={{
                ...glass, padding: "28px",
                display: "flex", alignItems: "center", gap: "24px", marginBottom: "20px",
              }}>
                <div style={{ position: "relative", width: "80px", height: "80px", flexShrink: 0 }}>
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                    <circle cx="40" cy="40" r="34" fill="none"
                      stroke={completedCount === 5 ? "#22C55E" : "#3B82F6"}
                      strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - progressPct / 100)}`}
                      transform="rotate(-90 40 40)"
                      style={{ transition: "stroke-dashoffset 0.8s ease" }}
                    />
                  </svg>
                  <div style={{
                    position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "20px", fontWeight: 800, fontFamily: "'Outfit', sans-serif",
                    color: completedCount === 5 ? "#22C55E" : "#F8FAFC",
                  }}>
                    {journey.progress}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "17px", fontWeight: 700, fontFamily: "'Outfit', sans-serif", marginBottom: "4px" }}>
                    {completedCount === 5 ? "All Done! 🎉" : completedCount === 0 ? "Your Journey Begins" : "Keep Going!"}
                  </div>
                  <div style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.5 }}>
                    {completedCount === 5
                      ? "You've completed all stations."
                      : `${5 - completedCount} station${5 - completedCount > 1 ? "s" : ""} remaining`}
                  </div>
                </div>
              </div>
            )}

            {/* ── Station Cards ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              {STATIONS.map((st) => {
                const status = journey.statuses[st.key];
                const data = journey[st.key];
                const score = data ? getScore(data) : null;
                const isCompleted = status === "Completed";
                const isInProgress = status === "In Progress";
                const isLocked = !isFrontDeskCheckedIn;

                return (
                  <button
                    key={st.key}
                    onClick={() => { if (!isLocked) setActiveStation(st.key); }}
                    disabled={isLocked}
                    style={{
                      width: "100%", padding: "18px 20px", borderRadius: "16px",
                      cursor: isLocked ? "not-allowed" : "pointer",
                      border: `1px solid ${isLocked ? "rgba(255,255,255,0.03)" : isCompleted ? "rgba(34,197,94,0.15)" : isInProgress ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.06)"}`,
                      background: isLocked ? "rgba(255,255,255,0.01)" : isCompleted ? "rgba(34,197,94,0.04)" : isInProgress ? "rgba(59,130,246,0.04)" : "rgba(255,255,255,0.02)",
                      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                      color: "#F8FAFC", textAlign: "left",
                      display: "flex", alignItems: "center", gap: "14px",
                      transition: "all 0.2s ease",
                      fontFamily: "'DM Sans', sans-serif",
                      opacity: isLocked ? 0.4 : 1,
                    }}
                    onMouseEnter={(e) => { if (!isLocked) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.borderColor = `${st.accent}40`; } }}
                    onMouseLeave={(e) => { if (!isLocked) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = isCompleted ? "rgba(34,197,94,0.15)" : isInProgress ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.06)"; } }}
                  >
                    <div style={{
                      width: "44px", height: "44px", borderRadius: "12px",
                      background: isLocked ? "rgba(255,255,255,0.03)" : st.accentBg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "20px", flexShrink: 0,
                      filter: isLocked ? "grayscale(1)" : "none",
                    }}>{st.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "14px", fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
                        {st.label}
                      </div>
                      <div style={{
                        fontSize: "12px", marginTop: "3px", fontWeight: 500,
                        color: isLocked ? "#334155" : (STATUS_COLORS[status] || "#475569"),
                      }}>
                        {isLocked ? "Locked" : `${status}${isCompleted && score ? ` • ${score}/5` : ""}`}
                      </div>
                    </div>
                    <div style={{ color: isLocked ? "#1E293B" : "#334155", fontSize: "18px", flexShrink: 0 }}>
                      {isLocked ? "🔒" : "›"}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ── Interview Info (if assigned & checked in) ── */}
            {isFrontDeskCheckedIn && journey.interview && (journey.interview.interviewer || journey.interview.room) && (
              <div style={{ ...glass, padding: "20px", marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "14px" }}>
                  Your Technical Interview
                </div>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  {journey.interview.interviewer && (
                    <div style={{ fontSize: "13px" }}>
                      <span style={{ color: "#475569" }}>With </span>
                      <span style={{ color: "#F8FAFC", fontWeight: 600 }}>{journey.interview.interviewer}</span>
                    </div>
                  )}
                  {journey.interview.room && (
                    <div style={{ fontSize: "13px" }}>
                      <span style={{ color: "#475569" }}>Room </span>
                      <span style={{ color: "#F8FAFC", fontWeight: 600 }}>{journey.interview.room}</span>
                    </div>
                  )}
                  {journey.interview.timeSlot && (
                    <div style={{ fontSize: "13px" }}>
                      <span style={{ color: "#475569" }}>At </span>
                      <span style={{ color: "#F8FAFC", fontWeight: 600 }}>{journey.interview.timeSlot}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Refresh Button ── */}
            <button onClick={() => fetchJourney(journey.email)} style={{
              width: "100%", padding: "14px", fontSize: "13px", fontWeight: 500,
              borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)", color: "#64748B", cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s ease",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "#94A3B8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#64748B"; }}
            >
              🔄 Refresh
            </button>


          </>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* MEET THE PANEL TAB                                       */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === "panel" && (
          <>
            {/* Section header */}
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 800, fontFamily: "'Outfit', sans-serif", margin: "0 0 6px 0" }}>
                My Network
              </h2>
              <p style={{ fontSize: "13px", color: "#64748B", margin: 0, lineHeight: 1.5 }}>
                The professionals behind Career Fair 2026
              </p>
            </div>

            {exhibitorsLoading ? (
              <div style={{ ...glass, padding: "40px", textAlign: "center" }}>
                <span style={{
                  width: "24px", height: "24px", border: "2px solid rgba(255,255,255,0.1)",
                  borderTopColor: "#3B82F6", borderRadius: "50%",
                  display: "inline-block", animation: "cpspin 0.6s linear infinite",
                }} />
                <div style={{ marginTop: "12px", fontSize: "13px", color: "#64748B" }}>Loading panelists...</div>
              </div>
            ) : exhibitors.length === 0 ? (
              <div style={{ ...glass, padding: "40px", textAlign: "center" }}>
                <div style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.5 }}>👥</div>
                <div style={{ fontSize: "14px", color: "#64748B" }}>No panelists listed yet.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {/* Count */}
                <div style={{
                  fontSize: "12px", color: "#475569", fontWeight: 500,
                  padding: "0 4px", marginBottom: "4px",
                }}>
                  {exhibitors.length} professional{exhibitors.length !== 1 ? "s" : ""}
                </div>

                {exhibitors.map((person, i) => (
                  <ExhibitorCard key={i} person={person} />
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </Wrapper>
  );
}