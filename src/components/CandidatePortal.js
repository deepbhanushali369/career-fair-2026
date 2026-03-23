"use client";

import { useState, useEffect, useCallback } from "react";

const SCORE_LABELS = { 5: "Excellent", 4: "Great", 3: "Good", 2: "Fair", 1: "Needs Improvement" };
const SCORE_COLORS = { 5: "#22C55E", 4: "#3B82F6", 3: "#EAB308", 2: "#F97316", 1: "#EF4444" };
const STATUS_COLORS = { Completed: "#22C55E", "In Progress": "#3B82F6", Pending: "#64748B" };
const STATUS_ICONS = { Completed: "✓", "In Progress": "◉", Pending: "○" };

const STATIONS = [
  { key: "oa", label: "Online Assessment", icon: "📝", checkinAction: "checkin-oa" },
  { key: "interview", label: "Technical Interview", icon: "💻", checkinAction: "checkin-interview" },
  { key: "behavioral", label: "Behavioural Interview", icon: "🗣️", checkinAction: "checkin-behavioral" },
  { key: "resume", label: "Resume / LinkedIn Review", icon: "📄", checkinAction: "checkin-resume" },
  { key: "ppt", label: "PPT Presentation", icon: "📊", checkinAction: "checkin-ppt" },
];

export default function CandidatePortal() {
  const [email, setEmail] = useState("");
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeStation, setActiveStation] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const fetchJourney = useCallback(async (em) => {
    const target = em || email;
    if (!target) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/sheets?action=journey&email=${encodeURIComponent(target)}`);
      if (!res.ok) { setError("Email not found. Please check and try again."); setJourney(null); return; }
      const data = await res.json();
      setJourney(data);
    } catch { setError("Something went wrong. Try again."); }
    finally { setLoading(false); }
  }, [email]);

  async function handleCheckin(station) {
    if (!journey) return;
    setCheckingIn(true);
    try {
      await fetch("/api/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: station.checkinAction,
          data: { name: journey.name, email: journey.email, domain: journey.domain },
        }),
      });
      await fetchJourney(journey.email);
    } catch (err) { console.error("Check-in failed:", err); }
    finally { setCheckingIn(false); }
  }

  function handleLogin(e) {
    e.preventDefault();
    fetchJourney();
  }

  // ── Login Screen ──
  if (!journey) {
    return (
      <div style={{ minHeight: "100vh", background: "#0B1120", color: "#F8FAFC", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ width: "100%", maxWidth: "400px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎯</div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, margin: "0 0 8px 0" }}>Career Fair 2026</h1>
          <p style={{ color: "#94A3B8", fontSize: "14px", margin: "0 0 32px 0" }}>Enter your email to view your journey</p>

          <form onSubmit={handleLogin}>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@university.edu" required
              style={{
                width: "100%", padding: "14px 16px", borderRadius: "12px", fontSize: "15px",
                border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)",
                color: "#F8FAFC", outline: "none", boxSizing: "border-box", marginBottom: "12px",
              }}
            />
            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "14px", borderRadius: "12px", border: "none", fontSize: "15px",
              fontWeight: 600, cursor: "pointer", color: "#FFF",
              background: loading ? "#334155" : "linear-gradient(135deg, #3B82F6, #8B5CF6)",
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? "Looking up..." : "View My Journey"}
            </button>
          </form>

          {error && <p style={{ color: "#F87171", fontSize: "13px", marginTop: "16px" }}>{error}</p>}
        </div>
      </div>
    );
  }

  // ── Station Detail View ──
  if (activeStation) {
    const st = STATIONS.find((s) => s.key === activeStation);
    const status = journey.statuses[activeStation];
    const data = journey[activeStation];

    return (
      <div style={{ minHeight: "100vh", background: "#0B1120", color: "#F8FAFC", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ maxWidth: "480px", margin: "0 auto", padding: "20px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <button onClick={() => setActiveStation(null)} style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#94A3B8", padding: "8px 14px", borderRadius: "10px", cursor: "pointer", fontSize: "14px",
            }}>← Back</button>
            <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>{st.icon} {st.label}</h2>
          </div>

          {/* Status Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px",
            borderRadius: "20px", marginBottom: "24px", fontSize: "13px", fontWeight: 600,
            background: `${STATUS_COLORS[status]}15`, color: STATUS_COLORS[status],
            border: `1px solid ${STATUS_COLORS[status]}30`,
          }}>
            {STATUS_ICONS[status]} {status}
          </div>

          {/* Station-specific content */}
          {status === "Pending" && (
            <div style={{
              background: "rgba(255,255,255,0.04)", borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.08)", padding: "32px", textAlign: "center",
            }}>
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>📍</div>
              <p style={{ color: "#94A3B8", fontSize: "14px", margin: "0 0 24px 0" }}>
                {activeStation === "interview"
                  ? "You are assigned to this station. Tap Check In when you arrive."
                  : "Tap Check In when you arrive at this station."}
              </p>
              <button
                onClick={() => handleCheckin(st)} disabled={checkingIn}
                style={{
                  padding: "14px 32px", borderRadius: "12px", border: "none", fontSize: "15px",
                  fontWeight: 600, cursor: "pointer", color: "#FFF",
                  background: checkingIn ? "#334155" : "linear-gradient(135deg, #3B82F6, #6366F1)",
                }}>
                {checkingIn ? "Checking in..." : "✓ Check In"}
              </button>
            </div>
          )}

          {status === "In Progress" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{
                background: "rgba(59,130,246,0.08)", borderRadius: "16px",
                border: "1px solid rgba(59,130,246,0.15)", padding: "24px", textAlign: "center",
              }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
                <p style={{ color: "#93C5FD", fontSize: "15px", fontWeight: 500, margin: 0 }}>
                  You&#39;re checked in! Awaiting evaluation...
                </p>
              </div>

              {/* Show details if available (interview has pre-assigned info) */}
              {activeStation === "interview" && data && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <InfoCard icon="👤" label="Interviewer" value={data.interviewer || "TBD"} />
                  <InfoCard icon="🕐" label="Time Slot" value={data.timeSlot || "TBD"} />
                  <InfoCard icon="📍" label="Room" value={data.room || "TBD"} />
                </div>
              )}
              {activeStation === "behavioral" && data && data.room && (
                <InfoCard icon="📍" label="Room" value={data.room} />
              )}
            </div>
          )}

          {status === "Completed" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Score display */}
              {data && getScore(data) && (
                <div style={{
                  background: "rgba(255,255,255,0.04)", borderRadius: "16px",
                  border: "1px solid rgba(255,255,255,0.08)", padding: "24px",
                  display: "flex", alignItems: "center", gap: "20px",
                }}>
                  <div style={{
                    width: "64px", height: "64px", borderRadius: "16px", flexShrink: 0,
                    background: `linear-gradient(135deg, ${SCORE_COLORS[getScore(data)]}, ${SCORE_COLORS[getScore(data)]}88)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "28px", fontWeight: 700,
                  }}>
                    {getScore(data)}
                  </div>
                  <div>
                    <div style={{ fontSize: "20px", fontWeight: 600 }}>{SCORE_LABELS[getScore(data)] || "Scored"}</div>
                    <div style={{ fontSize: "13px", color: "#94A3B8", marginTop: "2px" }}>Score: {getScore(data)}/5</div>
                  </div>
                </div>
              )}

              {/* Details for interview */}
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
              {data && getFeedback(data) && (
                <div style={{
                  background: "rgba(255,255,255,0.04)", borderRadius: "16px",
                  border: "1px solid rgba(255,255,255,0.08)", padding: "20px",
                }}>
                  <div style={{ fontSize: "13px", color: "#94A3B8", marginBottom: "8px", fontWeight: 500 }}>Feedback</div>
                  <div style={{ fontSize: "14px", lineHeight: 1.7, color: "#CBD5E1" }}>{getFeedback(data)}</div>
                </div>
              )}
            </div>
          )}

          {/* Refresh */}
          <button onClick={() => fetchJourney(journey.email)} style={{
            width: "100%", marginTop: "24px", padding: "14px", fontSize: "14px", fontWeight: 500,
            borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)", color: "#94A3B8", cursor: "pointer",
          }}>
            🔄 Refresh
          </button>
        </div>
      </div>
    );
  }

  // ── Hub Screen (Main Dashboard) ──
  const completedCount = journey.completedCount || 0;
  const progressPct = (completedCount / 5) * 100;

  return (
    <div style={{ minHeight: "100vh", background: "#0B1120", color: "#F8FAFC", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "20px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px 0" }}>
              Welcome, {journey.name?.split(" ")[0] || "Candidate"} 👋
            </h1>
            <p style={{ color: "#94A3B8", fontSize: "13px", margin: 0 }}>{journey.domain}</p>
          </div>
          <button onClick={() => { setJourney(null); setEmail(""); setActiveStation(null); }} style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#94A3B8", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px",
          }}>
            Logout
          </button>
        </div>

        {/* Progress Ring */}
        <div style={{
          background: "rgba(255,255,255,0.04)", borderRadius: "20px",
          border: "1px solid rgba(255,255,255,0.08)", padding: "28px",
          display: "flex", alignItems: "center", gap: "24px", marginBottom: "24px",
        }}>
          <div style={{ position: "relative", width: "80px", height: "80px", flexShrink: 0 }}>
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
              <circle cx="40" cy="40" r="34" fill="none" stroke={completedCount === 5 ? "#22C55E" : "#3B82F6"}
                strokeWidth="6" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - progressPct / 100)}`}
                transform="rotate(-90 40 40)" style={{ transition: "stroke-dashoffset 0.6s ease" }}
              />
            </svg>
            <div style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "20px", fontWeight: 700, color: completedCount === 5 ? "#22C55E" : "#F8FAFC",
            }}>
              {journey.progress}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "4px" }}>
              {completedCount === 5 ? "All Stations Complete! 🎉" : completedCount === 0 ? "Your Journey Begins" : "Keep Going!"}
            </div>
            <div style={{ fontSize: "13px", color: "#94A3B8" }}>
              {completedCount === 5
                ? "You've completed all stations."
                : `${5 - completedCount} station${5 - completedCount > 1 ? "s" : ""} remaining`}
            </div>
          </div>
        </div>

        {/* Station Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {STATIONS.map((st) => {
            const status = journey.statuses[st.key];
            const data = journey[st.key];
            const score = data ? getScore(data) : null;

            return (
              <button
                key={st.key}
                onClick={() => setActiveStation(st.key)}
                style={{
                  width: "100%", padding: "20px", borderRadius: "16px", cursor: "pointer",
                  border: `1px solid ${status === "Completed" ? "rgba(34,197,94,0.15)" : status === "In Progress" ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.08)"}`,
                  background: status === "Completed" ? "rgba(34,197,94,0.06)" : status === "In Progress" ? "rgba(59,130,246,0.06)" : "rgba(255,255,255,0.03)",
                  color: "#F8FAFC", textAlign: "left", display: "flex", alignItems: "center", gap: "16px",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ fontSize: "28px", flexShrink: 0 }}>{st.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>{st.label}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{
                      fontSize: "12px", fontWeight: 600, color: STATUS_COLORS[status],
                    }}>
                      {STATUS_ICONS[status]} {status}
                    </span>
                    {score && (
                      <span style={{
                        fontSize: "11px", padding: "2px 8px", borderRadius: "6px",
                        background: `${SCORE_COLORS[score]}20`, color: SCORE_COLORS[score], fontWeight: 600,
                      }}>
                        {score}/5
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ color: "#475569", fontSize: "18px" }}>›</div>
              </button>
            );
          })}
        </div>

        {/* Refresh */}
        <button onClick={() => fetchJourney(journey.email)} style={{
          width: "100%", marginTop: "20px", padding: "14px", fontSize: "14px", fontWeight: 500,
          borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.05)", color: "#94A3B8", cursor: "pointer",
        }}>
          🔄 Refresh My Journey
        </button>
      </div>
    </div>
  );
}

// ── Helper: extract score number from different station data shapes ──
function getScore(data) {
  if (!data) return null;
  const raw = data.scorecard || data.score || "";
  if (!raw) return null;
  const num = parseInt(raw, 10);
  return (num >= 1 && num <= 5) ? num : null;
}

// ── Helper: extract feedback/notes from different station data shapes ──
function getFeedback(data) {
  if (!data) return null;
  return data.feedback || data.notes || "";
}

// ── Reusable info card ──
function InfoCard({ icon, label, value }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", borderRadius: "14px",
      border: "1px solid rgba(255,255,255,0.08)", padding: "16px 20px",
      display: "flex", alignItems: "center", gap: "14px",
    }}>
      <div style={{
        width: "40px", height: "40px", borderRadius: "10px",
        background: "rgba(59,130,246,0.12)", display: "flex",
        alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: "15px", fontWeight: 500, marginTop: "2px" }}>{value}</div>
      </div>
    </div>
  );
}