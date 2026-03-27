"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Constants ────────────────────────────────────────────────────────
const SCORE_LABELS = { 10: "Outstanding", 9: "Excellent", 8: "Great", 7: "Very Good", 6: "Good", 5: "Average", 4: "Below Average", 3: "Fair", 2: "Poor", 1: "Needs Work" };
function getScoreColor(s) {
  if (s >= 8) return "#22C55E";
  if (s >= 6) return "#3B82F6";
  if (s >= 4) return "#EAB308";
  if (s >= 2) return "#F97316";
  return "#EF4444";
}

// Stations in event flow order — Panel Interview is last and gated
const STATIONS = [
  { key: "ia", label: "Initial Assessment", icon: "📝", checkinAction: "checkin-ia", accent: "#F59E0B", accentBg: "rgba(245,158,11,0.12)" },
  { key: "behavioral", label: "Behavioural Interview", icon: "🗣️", checkinAction: "checkin-behavioral", accent: "#EC4899", accentBg: "rgba(236,72,153,0.12)" },
  { key: "resume", label: "Resume / LinkedIn Review", icon: "📄", checkinAction: "checkin-resume", accent: "#14B8A6", accentBg: "rgba(20,184,166,0.12)" },
  { key: "interview", label: "Panel Interview", icon: "💼", checkinAction: "checkin-interview", accent: "#6366F1", accentBg: "rgba(99,102,241,0.12)" },
];

const glass = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "20px",
};

// ── Helpers ──────────────────────────────────────────────────────────
function getScore(data) {
  if (!data) return null;
  const val = data.score || data.techScore;
  return val ? parseInt(val) : null;
}
function getFeedback(data) {
  if (!data) return null;
  return data.feedback || data.techFeedback || data.notes || null;
}
function getHeadshotUrl(url) {
  if (!url) return null;
  let match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) return `https://lh3.googleusercontent.com/d/${match[1]}`;
  return null;
}

// ── Status colors for normal stations ──
function getStatusColor(status) {
  if (status === "Completed") return "#22C55E";
  if (status === "In Progress") return "#3B82F6";
  return "#64748B";
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
function ExhibitorCard({ person }) {
  const initials = `${(person.firstName || "")[0] || ""}${(person.lastName || "")[0] || ""}`.toUpperCase();
  const photoUrl = getHeadshotUrl(person.headshot);
  return (
    <div style={{ ...glass, padding: "20px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={`${person.firstName} ${person.lastName}`}
          referrerPolicy="no-referrer"
          style={{
            width: "48px", height: "48px", borderRadius: "12px", flexShrink: 0,
            objectFit: "cover", border: "1px solid rgba(255,255,255,0.1)",
          }}
          onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
        />
      ) : null}
      <div style={{
        width: "48px", height: "48px", borderRadius: "12px", flexShrink: 0,
        background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.15))",
        border: "1px solid rgba(59,130,246,0.15)",
        display: photoUrl ? "none" : "flex", alignItems: "center", justifyContent: "center",
        fontSize: "15px", fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: "#60A5FA",
      }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "15px", fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: "#F8FAFC" }}>
          {person.firstName} {person.lastName}
        </div>
        <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "3px" }}>{person.position}</div>
        <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>{person.company}</div>
        {person.linkedin && (
          <a href={person.linkedin} target="_blank" rel="noopener noreferrer" style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            marginTop: "10px", padding: "5px 12px", borderRadius: "8px",
            background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.15)",
            color: "#60A5FA", fontSize: "11px", fontWeight: 600,
            textDecoration: "none", letterSpacing: "0.3px",
          }}>
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
  const [activeTab, setActiveTab] = useState("journey");
  const [exhibitors, setExhibitors] = useState(null); // null = not loaded, [] = loaded empty
  const [exhibitorsLoading, setExhibitorsLoading] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => { setLoaded(true); }, []);

  // ── Fetch journey ──
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
      setJourney(await res.json());
    } catch {
      if (!silent) setError("Something went wrong. Try again.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [email]);

  // ── Auto-poll every 45 seconds ──
  useEffect(() => {
    if (!journey?.email) return;
    pollRef.current = setInterval(() => fetchJourney(journey.email, true), 45000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [journey?.email, fetchJourney]);

  // ── Fetch exhibitors once (cached) ──
  useEffect(() => {
    if (activeTab === "panel" && exhibitors === null && !exhibitorsLoading) {
      setExhibitorsLoading(true);
      fetch("/api/sheets?action=exhibitors")
        .then((r) => r.json())
        .then((data) => setExhibitors(Array.isArray(data) ? data : []))
        .catch(() => setExhibitors([]))
        .finally(() => setExhibitorsLoading(false));
    }
  }, [activeTab, exhibitors, exhibitorsLoading]);

  // ── Check in ──
  async function handleCheckin(station) {
    if (!journey || checkingIn) return;
    setCheckingIn(true);
    try {
      const res = await fetch("/api/update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: station.checkinAction,
          email: journey.email, name: journey.name, domain: journey.domain, jobRole: journey.jobRole,
        }),
      });
      if (res.ok) await fetchJourney(journey.email);
    } catch {}
    finally { setCheckingIn(false); }
  }

  function handleLogin(e) {
    e.preventDefault();
    if (!email.trim()) return;
    fetchJourney(email.trim());
  }

  function handleLogout() {
    if (pollRef.current) clearInterval(pollRef.current);
    setJourney(null); setEmail(""); setError("");
    setActiveStation(null); setActiveTab("journey");
  }

  // ── Wrapper ──
  const Wrapper = ({ children }) => (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <div style={{ minHeight: "100vh", background: "#060B18", color: "#F8FAFC", fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" }}>
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
        <div style={{ maxWidth: "420px", margin: "0 auto", padding: "24px 20px", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", justifyContent: "center" }}>
          <div style={{ position: "absolute", top: "24px", left: "20px", opacity: loaded ? 1 : 0, transform: loaded ? "translateX(0)" : "translateX(-10px)", transition: "all 0.5s ease" }}>
            <button onClick={() => window.location.reload()} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#64748B", padding: "8px 14px", borderRadius: "10px", cursor: "pointer",
              fontSize: "13px", display: "flex", alignItems: "center", gap: "6px",
              backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", transition: "all 0.2s ease",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "#94A3B8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#64748B"; }}
            >← Back</button>
          </div>

          <div style={{ textAlign: "center", marginBottom: "36px", opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(20px)", transition: "all 0.8s ease 0.1s" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "18px", margin: "0 auto 20px", background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.08))", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px" }}>🎯</div>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "28px", fontWeight: 800, lineHeight: 1.2, margin: "0 0 10px 0", background: "linear-gradient(135deg, #F8FAFC 30%, #94A3B8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Welcome, Candidate</h1>
            <p style={{ fontSize: "14px", color: "#64748B", margin: 0, lineHeight: 1.5 }}>Enter your registered email to view<br />your career fair journey</p>
          </div>

          <div style={{ ...glass, padding: "32px 28px", opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(20px)", transition: "all 0.8s ease 0.25s" }}>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "12px", color: "#64748B", fontWeight: 500, display: "block", marginBottom: "8px", letterSpacing: "0.3px" }}>Your Email</label>
                <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="name@example.com" required autoFocus
                  style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", fontSize: "15px", fontFamily: "'DM Sans', sans-serif", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)", color: "#F8FAFC", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s ease" }}
                  onFocus={(e) => e.target.style.borderColor = "rgba(59,130,246,0.4)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                />
              </div>
              <button type="submit" disabled={loading} style={{
                width: "100%", padding: "14px", borderRadius: "12px", border: "none",
                background: loading ? "rgba(59,130,246,0.3)" : "linear-gradient(135deg, #3B82F6, #6366F1)",
                color: "#FFF", fontSize: "15px", fontWeight: 700, fontFamily: "'Outfit', sans-serif",
                cursor: loading ? "wait" : "pointer", transition: "all 0.2s ease",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}>
                {loading ? (<><span style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "cpspin 0.6s linear infinite" }} />Finding you...</>) : "Enter the Fair →"}
              </button>
            </form>
            {error && (<div style={{ marginTop: "16px", padding: "12px 16px", borderRadius: "10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", fontSize: "13px", color: "#F87171", textAlign: "center", lineHeight: 1.5 }}>{error}</div>)}
          </div>

          <div style={{ marginTop: "20px", textAlign: "center", opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(20px)", transition: "all 0.8s ease 0.4s" }}>
            <p style={{ fontSize: "12px", color: "#475569", lineHeight: 1.6 }}>Use the email you registered with on the Google Form.<br />Can&#39;t find yours? Visit the <span style={{ color: "#60A5FA" }}>Front Desk</span>.</p>
          </div>

          <div style={{ marginTop: "32px", display: "flex", justifyContent: "center", gap: "24px", opacity: loaded ? 1 : 0, transition: "all 0.8s ease 0.55s" }}>
            {[{ icon: "🕤", text: "9:30 AM" }, { icon: "📅", text: "Mar 28, 2026" }].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#475569" }}><span>{item.icon}</span><span>{item.text}</span></div>
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
    const isInterview = st.key === "interview";

    return (
      <Wrapper>
        <div style={{ maxWidth: "480px", margin: "0 auto", padding: "20px", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
            <button onClick={() => setActiveStation(null)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94A3B8", padding: "10px 14px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontFamily: "'DM Sans', sans-serif" }}>←</button>
            <div>
              <div style={{ fontSize: "18px", fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>{st.icon} {st.label}</div>
              <div style={{ fontSize: "12px", fontWeight: 600, marginTop: "4px", color: getStatusColor(status) }}>{status}</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Pending — check in */}
            {status === "Pending" && (
              <div style={{ ...glass, padding: "28px", textAlign: "center" }}>
                <div style={{ fontSize: "40px", marginBottom: "16px", opacity: 0.6 }}>⏳</div>
                <div style={{ fontSize: "16px", fontWeight: 600, fontFamily: "'Outfit', sans-serif", marginBottom: "8px" }}>Not Started Yet</div>
                <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 20px", lineHeight: 1.5 }}>Tap below when you arrive at this desk.</p>
                <button onClick={() => handleCheckin(st)} disabled={checkingIn} style={{
                  width: "100%", padding: "14px", borderRadius: "12px", border: "none",
                  background: checkingIn ? "rgba(255,255,255,0.1)" : `linear-gradient(135deg, ${st.accent}, ${st.accent}CC)`,
                  color: "#FFF", fontSize: "15px", fontWeight: 700, fontFamily: "'Outfit', sans-serif",
                  cursor: checkingIn ? "wait" : "pointer", transition: "all 0.2s ease",
                }}>{checkingIn ? "Checking in..." : "Check In →"}</button>
              </div>
            )}

            {/* Assigned (Interview only — qualified, assigned but not checked in) */}
            {status === "Assigned" && (
              <div style={{ ...glass, padding: "28px", textAlign: "center" }}>
                <div style={{ fontSize: "40px", marginBottom: "16px" }}>🎉</div>
                <div style={{ fontSize: "16px", fontWeight: 600, fontFamily: "'Outfit', sans-serif", marginBottom: "8px", color: "#22C55E" }}>
                  You&#39;ve been assigned!
                </div>
                <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 20px", lineHeight: 1.5 }}>Head to your interview room and check in when you arrive.</p>
                <button onClick={() => handleCheckin(st)} disabled={checkingIn} style={{
                  width: "100%", padding: "14px", borderRadius: "12px", border: "none",
                  background: checkingIn ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #6366F1, #8B5CF6)",
                  color: "#FFF", fontSize: "15px", fontWeight: 700, fontFamily: "'Outfit', sans-serif",
                  cursor: checkingIn ? "wait" : "pointer", transition: "all 0.2s ease",
                }}>{checkingIn ? "Checking in..." : "Check In →"}</button>
              </div>
            )}

            {/* In Progress */}
            {status === "In Progress" && (
              <div style={{ ...glass, padding: "28px", textAlign: "center" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", margin: "0 auto 16px", background: "rgba(59,130,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>◉</div>
                <div style={{ fontSize: "16px", fontWeight: 600, fontFamily: "'Outfit', sans-serif", marginBottom: "6px" }}>In Progress</div>
                <p style={{ fontSize: "13px", color: "#64748B", margin: 0, lineHeight: 1.5 }}>You&#39;re checked in. Scores will appear here once submitted.</p>
              </div>
            )}

            {/* Completed */}
            {status === "Completed" && score && (
              <div style={{ ...glass, padding: "28px", textAlign: "center", borderColor: "rgba(34,197,94,0.15)", background: "rgba(34,197,94,0.04)" }}>
                <div style={{ fontSize: "48px", fontWeight: 900, fontFamily: "'Outfit', sans-serif", color: getScoreColor(score) || "#F8FAFC", marginBottom: "6px" }}>
                  {score}<span style={{ fontSize: "20px", color: "#475569" }}>/10</span>
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: getScoreColor(score) || "#94A3B8" }}>{SCORE_LABELS[score] || "Scored"}</div>
              </div>
            )}

            {/* Interview-specific: show PPT score too if completed */}
            {isInterview && status === "Completed" && data?.pptScore && (
              <div style={{ ...glass, padding: "20px", textAlign: "center" }}>
                <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>PPT Presentation Score</div>
                <div style={{ fontSize: "32px", fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: getScoreColor(parseInt(data.pptScore)) || "#F8FAFC" }}>
                  {data.pptScore}<span style={{ fontSize: "16px", color: "#475569" }}>/10</span>
                </div>
                {data.pptFeedback && <div style={{ fontSize: "13px", color: "#94A3B8", marginTop: "8px" }}>{data.pptFeedback}</div>}
              </div>
            )}

            {/* Interview details */}
            {isInterview && data && (
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
                <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Feedback</div>
                <div style={{ fontSize: "14px", lineHeight: 1.7, color: "#CBD5E1" }}>{feedback}</div>
              </div>
            )}
          </div>

          <button onClick={() => fetchJourney(journey.email)} style={{
            width: "100%", marginTop: "24px", padding: "14px", fontSize: "13px", fontWeight: 500,
            borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)", color: "#64748B", cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s ease",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "#94A3B8"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#64748B"; }}
          >🔄 Refresh Status</button>
        </div>
      </Wrapper>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // HUB SCREEN
  // ══════════════════════════════════════════════════════════════════
  const completedCount = journey.completedCount || 0;
  const totalStations = journey.totalStations || 4;
  const progressPct = (completedCount / totalStations) * 100;
  const firstName = journey.name?.split(" ")[0] || "Candidate";
  const isFrontDeskCheckedIn = journey.frontDeskCheckedIn;
  const iaQualified = journey.iaQualified;
  const interviewLockReason = journey.interviewLockReason;
  const interviewStatus = journey.statuses?.interview;

  // Is interview card fully unlocked? (assigned or in progress or completed)
  const interviewUnlocked = ["Assigned", "In Progress", "Completed"].includes(interviewStatus);

  return (
    <Wrapper>
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "20px", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 4px 0", fontFamily: "'Outfit', sans-serif" }}>Hey, {firstName} 👋</h1>
            <p style={{ color: "#64748B", fontSize: "13px", margin: 0 }}>{journey.jobRole || journey.domain || "Candidate"}</p>
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

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "20px", padding: "4px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
          {[{ key: "journey", label: "My Journey" }, { key: "panel", label: "My Network" }].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              flex: 1, padding: "10px 0", borderRadius: "9px", border: "none",
              fontSize: "13px", fontWeight: 600, fontFamily: "'Outfit', sans-serif",
              cursor: "pointer", transition: "all 0.2s ease",
              background: activeTab === tab.key ? "rgba(255,255,255,0.08)" : "transparent",
              color: activeTab === tab.key ? "#F8FAFC" : "#64748B",
            }}>{tab.label}</button>
          ))}
        </div>

        {/* ═══════════════════ MY JOURNEY TAB ═══════════════════ */}
        {activeTab === "journey" && (
          <>
            {/* Front Desk Gate */}
            {!isFrontDeskCheckedIn && (
              <div style={{ ...glass, padding: "28px", textAlign: "center", marginBottom: "20px", borderColor: "rgba(245,158,11,0.15)", background: "rgba(245,158,11,0.04)" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>🚪</div>
                <div style={{ fontSize: "17px", fontWeight: 700, fontFamily: "'Outfit', sans-serif", marginBottom: "8px", background: "linear-gradient(135deg, #F59E0B, #F97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Check In at the Front Desk
                </div>
                <p style={{ fontSize: "13px", color: "#94A3B8", margin: 0, lineHeight: 1.6 }}>Visit the registration counter to get checked in.<br />Once done, all desks will unlock here.</p>
              </div>
            )}

            {/* Progress Card */}
            {isFrontDeskCheckedIn && (
              <div style={{ ...glass, padding: "28px", display: "flex", alignItems: "center", gap: "24px", marginBottom: "20px" }}>
                <div style={{ position: "relative", width: "80px", height: "80px", flexShrink: 0 }}>
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                    <circle cx="40" cy="40" r="34" fill="none"
                      stroke={completedCount === totalStations ? "#22C55E" : "#3B82F6"}
                      strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - progressPct / 100)}`}
                      transform="rotate(-90 40 40)"
                      style={{ transition: "stroke-dashoffset 0.8s ease" }}
                    />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: completedCount === totalStations ? "#22C55E" : "#F8FAFC" }}>
                    {journey.progress}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "17px", fontWeight: 700, fontFamily: "'Outfit', sans-serif", marginBottom: "4px" }}>
                    {completedCount === totalStations ? "All Done! 🎉" : completedCount === 0 ? "Your Journey Begins" : "Keep Going!"}
                  </div>
                  <div style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.5 }}>
                    {completedCount === totalStations ? "You've completed all desks. Best of luck!" : `${totalStations - completedCount} desk${totalStations - completedCount > 1 ? "s" : ""} remaining`}
                  </div>
                </div>
              </div>
            )}

            {/* Station Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              {STATIONS.map((st) => {
                const status = journey.statuses[st.key];
                const data = journey[st.key];
                const score = data ? getScore(data) : null;
                const isCompleted = status === "Completed";
                const isInProgress = status === "In Progress";
                const isInterview = st.key === "interview";
                const isFrontLocked = !isFrontDeskCheckedIn;

                // Interview card has special gating
                const isInterviewLocked = isInterview && !interviewUnlocked;
                const isLocked = isFrontLocked || isInterviewLocked;

                // Determine subtitle for interview card
                let subtitle = status;
                if (isInterview && isInterviewLocked) {
                  if (interviewStatus === "Not Qualified") subtitle = "Not Qualified";
                  else if (interviewStatus === "Pending Review") subtitle = "Pending Review";
                  else if (interviewStatus === "Qualified") subtitle = "Qualified ✓";
                  else if (isFrontLocked) subtitle = "Locked";
                  else subtitle = "";
                } else if (isCompleted && score) {
                  subtitle = `${status} • ${score}/10`;
                }

                // Border/bg colors
                let borderColor = "rgba(255,255,255,0.06)";
                let bgColor = "rgba(255,255,255,0.02)";
                if (isLocked) { borderColor = "rgba(255,255,255,0.03)"; bgColor = "rgba(255,255,255,0.01)"; }
                else if (isCompleted) { borderColor = "rgba(34,197,94,0.15)"; bgColor = "rgba(34,197,94,0.04)"; }
                else if (isInProgress || status === "Assigned") { borderColor = "rgba(59,130,246,0.15)"; bgColor = "rgba(59,130,246,0.04)"; }

                // Special: qualified but not assigned — green tint
                if (isInterview && interviewStatus === "Qualified") {
                  borderColor = "rgba(34,197,94,0.2)"; bgColor = "rgba(34,197,94,0.06)";
                }

                // Subtitle color
                let subtitleColor = "#475569";
                if (!isLocked) subtitleColor = getStatusColor(status);
                if (isInterview && interviewStatus === "Qualified") subtitleColor = "#22C55E";
                if (isInterview && interviewStatus === "Not Qualified") subtitleColor = "#64748B";
                if (isInterview && interviewStatus === "Pending Review") subtitleColor = "#F59E0B";

                return (
                  <button key={st.key}
                    onClick={() => { if (!isLocked) setActiveStation(st.key); }}
                    disabled={isLocked}
                    style={{
                      width: "100%", padding: "18px 20px", borderRadius: "16px",
                      cursor: isLocked ? "not-allowed" : "pointer",
                      border: `1px solid ${borderColor}`, background: bgColor,
                      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                      color: "#F8FAFC", textAlign: "left",
                      display: "flex", alignItems: "center", gap: "14px",
                      transition: "all 0.2s ease", fontFamily: "'DM Sans', sans-serif",
                      opacity: isLocked ? (isInterview && interviewStatus !== "Locked" ? 0.7 : 0.4) : 1,
                    }}
                    onMouseEnter={(e) => { if (!isLocked) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.borderColor = `${st.accent}40`; } }}
                    onMouseLeave={(e) => { if (!isLocked) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = borderColor; } }}
                  >
                    <div style={{
                      width: "44px", height: "44px", borderRadius: "12px",
                      background: isLocked && !(isInterview && interviewStatus !== "Locked") ? "rgba(255,255,255,0.03)" : st.accentBg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "20px", flexShrink: 0,
                      filter: (isFrontLocked) ? "grayscale(1)" : "none",
                    }}>{st.icon}</div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "14px", fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>{st.label}</div>
                      <div style={{ fontSize: "12px", marginTop: "3px", fontWeight: 500, color: subtitleColor }}>
                        {isFrontLocked ? "Locked" : subtitle}
                      </div>
                      {/* Interview lock reason message */}
                      {isInterview && isInterviewLocked && !isFrontLocked && interviewLockReason && interviewLockReason !== "Pending Review" && interviewStatus !== "Qualified" && (
                        <div style={{ fontSize: "11px", color: "#475569", marginTop: "4px", lineHeight: 1.4 }}>
                          {interviewLockReason}
                        </div>
                      )}
                      {isInterview && interviewStatus === "Qualified" && (
                        <div style={{ fontSize: "11px", color: "#4ADE80", marginTop: "4px", lineHeight: 1.4 }}>
                          Details will appear here shortly
                        </div>
                      )}
                    </div>

                    <div style={{ color: isLocked ? "#1E293B" : "#334155", fontSize: "18px", flexShrink: 0 }}>
                      {isFrontLocked ? "🔒" : isInterviewLocked ? (interviewStatus === "Qualified" ? "✓" : interviewStatus === "Not Qualified" ? "" : "🔒") : "›"}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Not Qualified — motivational message card */}
            {isFrontDeskCheckedIn && interviewStatus === "Not Qualified" && (
              <div style={{ ...glass, padding: "20px", marginBottom: "16px", borderColor: "rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: "13px", color: "#94A3B8", lineHeight: 1.7 }}>
                  {interviewLockReason}
                </div>
              </div>
            )}

            {/* Refresh */}
            <button onClick={() => fetchJourney(journey.email)} style={{
              width: "100%", padding: "14px", fontSize: "13px", fontWeight: 500,
              borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)", color: "#64748B", cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s ease",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "#94A3B8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#64748B"; }}
            >🔄 Refresh</button>
          </>
        )}

        {/* ═══════════════════ MY NETWORK TAB ═══════════════════ */}
        {activeTab === "panel" && (
          <>
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 800, fontFamily: "'Outfit', sans-serif", margin: "0 0 6px 0" }}>My Network</h2>
              <p style={{ fontSize: "13px", color: "#64748B", margin: 0, lineHeight: 1.5 }}>The professionals behind Career Fair 2026</p>
            </div>

            {exhibitorsLoading ? (
              <div style={{ ...glass, padding: "40px", textAlign: "center" }}>
                <span style={{ width: "24px", height: "24px", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#3B82F6", borderRadius: "50%", display: "inline-block", animation: "cpspin 0.6s linear infinite" }} />
                <div style={{ marginTop: "12px", fontSize: "13px", color: "#64748B" }}>Loading...</div>
              </div>
            ) : !exhibitors || exhibitors.length === 0 ? (
              <div style={{ ...glass, padding: "40px", textAlign: "center" }}>
                <div style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.5 }}>👥</div>
                <div style={{ fontSize: "14px", color: "#64748B" }}>No panelists listed yet.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ fontSize: "12px", color: "#475569", fontWeight: 500, padding: "0 4px", marginBottom: "4px" }}>
                  {exhibitors.length} professional{exhibitors.length !== 1 ? "s" : ""}
                </div>
                {exhibitors.map((person, i) => (<ExhibitorCard key={i} person={person} />))}
              </div>
            )}
          </>
        )}
      </div>
    </Wrapper>
  );
}