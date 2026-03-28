"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ── Constants ────────────────────────────────────────────────────────
const DOMAINS = ["All", "Data", "Computer Science", "AI / Machine Learning", "Cybersecurity", "Product / Project Management", "Bio / Pharma / Life Sciences", "Electrical / Hardware Engineering", "Finance", "Supply Chain", "Other"];

const glass = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "20px",
};

const STATION_CARDS = [
  { key: "ia", label: "Initial Assessment", icon: "📝", accent: "#F59E0B", accentBg: "rgba(245,158,11,0.12)" },
  { key: "behavioural", label: "Behavioural Interview", icon: "🗣️", accent: "#EC4899", accentBg: "rgba(236,72,153,0.12)" },
  { key: "resume", label: "Resume / LinkedIn", icon: "📄", accent: "#14B8A6", accentBg: "rgba(20,184,166,0.12)" },
  { key: "panel", label: "Panel Interview", icon: "💼", accent: "#6366F1", accentBg: "rgba(99,102,241,0.12)" },
];

// ══════════════════════════════════════════════════════════════════════
// WRAPPER
// ══════════════════════════════════════════════════════════════════════
function Wrapper({ children }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <div style={{ minHeight: "100vh", background: "#060B18", color: "#F8FAFC", fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "fixed", top: "-30%", left: "-20%", width: "60%", height: "60%", background: "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "fixed", bottom: "-20%", right: "-10%", width: "50%", height: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
        {children}
      </div>
      <style>{`@keyframes cpspin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════
// TIMER COMPONENT (30 min countdown)
// ══════════════════════════════════════════════════════════════════════
function InterviewTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startTime) return;
    const tick = () => setElapsed(Math.floor((Date.now() - startTime) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const total = 30 * 60; // 30 minutes
  const remaining = Math.max(0, total - elapsed);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct = ((total - remaining) / total) * 100;
  const isWarning = remaining <= 300 && remaining > 60; // last 5 min
  const isDanger = remaining <= 60; // last 1 min
  const color = isDanger ? "#EF4444" : isWarning ? "#F59E0B" : "#3B82F6";

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        fontSize: "32px", fontWeight: 900, fontFamily: "'Outfit', sans-serif",
        color, letterSpacing: "2px",
      }}>
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </div>
      <div style={{ fontSize: "10px", color: "#64748B", textTransform: "uppercase", letterSpacing: "1px", marginTop: "4px" }}>
        {remaining === 0 ? "Time's Up" : "Remaining"}
      </div>
      {/* Progress bar */}
      <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", marginTop: "10px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "2px", transition: "width 1s linear" }} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
export default function InterviewerPortal({ onBack }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [station, setStation] = useState(null); // "ia" | "behavioural" | "resume" | "panel"
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [domain, setDomain] = useState("All");
  const [saving, setSaving] = useState(null); // rowIndex being saved
  const [savedRows, setSavedRows] = useState({}); // { rowIndex: true } for flash
  const [localEdits, setLocalEdits] = useState({}); // { "rowIndex-field": value }
  const [timers, setTimers] = useState({}); // { rowIndex: startTimestamp }
  const [loaded, setLoaded] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => { setLoaded(true); }, []);

  // ── Login ──
  function handleLogin(e) {
    e.preventDefault();
    if (username === "admin" && password === "1234") {
      setLoggedIn(true);
      setLoginError("");
    } else {
      setLoginError("Invalid credentials. Try again.");
    }
  }

  // ── Fetch station data ──
  const fetchData = useCallback(async (silent = false) => {
    if (!station) return;
    if (!silent) setLoading(true);
    try {
      let url = "";
      if (station === "ia") url = "/api/sheets?action=all-ia";
      else if (station === "behavioural") url = "/api/sheets?action=all-behavioural";
      else if (station === "resume") url = "/api/sheets?action=all-resume";
      else if (station === "panel") url = "/api/sheets?action=all-interviews";
      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        setData(Array.isArray(result) ? result : []);
      }
    } catch {}
    finally { if (!silent) setLoading(false); }
  }, [station]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!station) return;
    fetchData();
    pollRef.current = setInterval(() => fetchData(true), 60000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [station, fetchData]);

  // ── Local edit helpers ──
  function getLocal(rowIndex, field, original) {
    const key = `${rowIndex}-${field}`;
    return localEdits[key] !== undefined ? localEdits[key] : original;
  }
  function setLocal(rowIndex, field, value) {
    setLocalEdits((prev) => ({ ...prev, [`${rowIndex}-${field}`]: value }));
  }

  // ── Submit handlers ──
  async function submitIA(row) {
    setSaving(row.rowIndex);
    try {
      await fetch("/api/update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit-ia", rowIndex: row.rowIndex,
          score: getLocal(row.rowIndex, "score", row.score),
          comments: getLocal(row.rowIndex, "comments", row.comments),
        }),
      });
      setSavedRows((p) => ({ ...p, [row.rowIndex]: true }));
      setTimeout(() => setSavedRows((p) => { const n = { ...p }; delete n[row.rowIndex]; return n; }), 2000);
      await fetchData(true);
    } catch {}
    finally { setSaving(null); }
  }

  async function submitBehavioural(row) {
    setSaving(row.rowIndex);
    try {
      await fetch("/api/update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit-behavioural", rowIndex: row.rowIndex,
          score: getLocal(row.rowIndex, "score", row.score),
          feedback: getLocal(row.rowIndex, "feedback", row.feedback),
        }),
      });
      setSavedRows((p) => ({ ...p, [row.rowIndex]: true }));
      setTimeout(() => setSavedRows((p) => { const n = { ...p }; delete n[row.rowIndex]; return n; }), 2000);
      await fetchData(true);
    } catch {}
    finally { setSaving(null); }
  }

  async function submitResume(row) {
    setSaving(row.rowIndex);
    try {
      await fetch("/api/update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit-resume", rowIndex: row.rowIndex,
          score: getLocal(row.rowIndex, "score", row.score),
        }),
      });
      setSavedRows((p) => ({ ...p, [row.rowIndex]: true }));
      setTimeout(() => setSavedRows((p) => { const n = { ...p }; delete n[row.rowIndex]; return n; }), 2000);
      await fetchData(true);
    } catch {}
    finally { setSaving(null); }
  }

  async function submitPanel(row) {
    setSaving(row.rowIndex);
    try {
      await fetch("/api/update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "interviewer-submit", rowIndex: row.rowIndex,
          techScore: getLocal(row.rowIndex, "techScore", row.techScore),
          techFeedback: getLocal(row.rowIndex, "techFeedback", row.techFeedback),
          pptScore: getLocal(row.rowIndex, "pptScore", row.pptScore),
          pptFeedback: getLocal(row.rowIndex, "pptFeedback", row.pptFeedback),
        }),
      });
      // Stop timer and clear local edits so it collapses
      setTimers((p) => { const n = { ...p }; delete n[row.rowIndex]; return n; });
      setLocalEdits((p) => {
        const n = { ...p };
        delete n[`${row.rowIndex}-techScore`];
        delete n[`${row.rowIndex}-techFeedback`];
        delete n[`${row.rowIndex}-pptScore`];
        delete n[`${row.rowIndex}-pptFeedback`];
        return n;
      });
      setSavedRows((p) => ({ ...p, [row.rowIndex]: true }));
      setTimeout(() => setSavedRows((p) => { const n = { ...p }; delete n[row.rowIndex]; return n; }), 2000);
      await fetchData(true);
    } catch {}
    finally { setSaving(null); }
  }

  async function handlePanelCheckin(row) {
    setSaving(row.rowIndex);
    try {
      await fetch("/api/update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkin-interview", email: row.email }),
      });
      setTimers((p) => ({ ...p, [row.rowIndex]: Date.now() }));
      await fetchData(true);
    } catch {}
    finally { setSaving(null); }
  }

  // ── Filter & sort ──
  function filterAndSort(list) {
    let filtered = domain === "All" ? list : list.filter((r) => r.domain === domain);
    // Checked-in first, then scored at bottom
    return filtered.sort((a, b) => {
      const aScored = !!(a.score || a.techScore);
      const bScored = !!(b.score || b.techScore);
      const aChecked = a.checkin === "Yes";
      const bChecked = b.checkin === "Yes";
      if (aScored !== bScored) return aScored ? 1 : -1; // scored goes to bottom
      if (aChecked !== bChecked) return aChecked ? -1 : 1; // checked-in goes to top
      return (a.name || "").localeCompare(b.name || "");
    });
  }

  // Stats
  function getStats(list) {
    const filtered = domain === "All" ? list : list.filter((r) => r.domain === domain);
    const scored = filtered.filter((r) => r.score || r.techScore).length;
    return { total: filtered.length, scored };
  }

  // ── Shared input style ──
  const inputStyle = {
    padding: "10px 12px", borderRadius: "10px", fontSize: "14px",
    border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)",
    color: "#F8FAFC", outline: "none", fontFamily: "'DM Sans', sans-serif",
    transition: "border-color 0.2s",
  };

  // ══════════════════════════════════════════════════════════════════
  // LOGIN SCREEN
  // ══════════════════════════════════════════════════════════════════
  if (!loggedIn) {
    return (
      <Wrapper>
        <div style={{ maxWidth: "420px", margin: "0 auto", padding: "24px 20px", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", justifyContent: "center" }}>
          <div style={{ position: "absolute", top: "24px", left: "20px", opacity: loaded ? 1 : 0, transition: "all 0.5s ease" }}>
            <button onClick={onBack} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#64748B", padding: "8px 14px", borderRadius: "10px", cursor: "pointer", fontSize: "13px",
              backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", transition: "all 0.2s ease",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#94A3B8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; }}
            >← Back</button>
          </div>

          <div style={{ textAlign: "center", marginBottom: "36px", opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(20px)", transition: "all 0.8s ease 0.1s" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "18px", margin: "0 auto 20px", background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.08))", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px" }}>🎤</div>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "28px", fontWeight: 800, lineHeight: 1.2, margin: "0 0 10px 0", background: "linear-gradient(135deg, #F8FAFC 30%, #94A3B8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Interviewer Portal</h1>
            <p style={{ fontSize: "14px", color: "#64748B", margin: 0 }}>Enter your credentials to continue</p>
          </div>

          <div style={{ ...glass, padding: "32px 28px", opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(20px)", transition: "all 0.8s ease 0.25s" }}>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", color: "#64748B", fontWeight: 500, display: "block", marginBottom: "8px" }}>Username</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                  onFocus={(e) => e.target.style.borderColor = "rgba(245,158,11,0.4)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "12px", color: "#64748B", fontWeight: 500, display: "block", marginBottom: "8px" }}>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                  onFocus={(e) => e.target.style.borderColor = "rgba(245,158,11,0.4)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                />
              </div>
              <button type="submit" style={{
                width: "100%", padding: "14px", borderRadius: "12px", border: "none",
                background: "linear-gradient(135deg, #F59E0B, #F97316)", color: "#FFF",
                fontSize: "15px", fontWeight: 700, fontFamily: "'Outfit', sans-serif", cursor: "pointer",
              }}>Login →</button>
            </form>
            {loginError && <div style={{ marginTop: "14px", padding: "10px", borderRadius: "10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", fontSize: "13px", color: "#F87171", textAlign: "center" }}>{loginError}</div>}
          </div>
        </div>
      </Wrapper>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // STATION SELECTOR
  // ══════════════════════════════════════════════════════════════════
  if (!station) {
    return (
      <Wrapper>
        <div style={{ maxWidth: "480px", margin: "0 auto", padding: "24px 20px", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0, fontFamily: "'Outfit', sans-serif" }}>Select Desk</h1>
              <p style={{ color: "#64748B", fontSize: "13px", margin: "4px 0 0" }}>Choose which desk you&#39;re evaluating</p>
            </div>
            <button onClick={onBack} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#64748B", padding: "8px 14px", borderRadius: "10px", cursor: "pointer", fontSize: "12px",
            }}>← Exit</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {STATION_CARDS.map((s) => (
              <button key={s.key}
                onClick={() => {
                  setStation(s.key); setDomain("All"); setLocalEdits({}); setSavedRows({});
                }}
                style={{
                  width: "100%", padding: "20px 24px", borderRadius: "16px", cursor: "pointer",
                  background: s.accentBg, border: `1px solid ${s.accent}30`,
                  color: "#F8FAFC", textAlign: "left",
                  display: "flex", alignItems: "center", gap: "16px", transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = `${s.accent}60`; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = `${s.accent}30`; }}
              >
                <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: `${s.accent}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>{s.label}</div>
                  <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>Score candidates by domain</div>
                </div>
                <div style={{ marginLeft: "auto", color: "#475569", fontSize: "20px" }}>›</div>
              </button>
            ))}
          </div>
        </div>
      </Wrapper>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // STATION VIEWS (IA / Behavioural / Resume / Panel)
  // ══════════════════════════════════════════════════════════════════

  const currentStation = STATION_CARDS.find((s) => s.key === station);
  const stats = getStats(data);
  const sorted = filterAndSort(data).sort((a, b) => {
    if (station === "panel") {
      const aActive = a.checkin === "Yes" && !a.techScore;
      const bActive = b.checkin === "Yes" && !b.techScore;
      const aDone = !!a.techScore;
      const bDone = !!b.techScore;
      if (aActive !== bActive) return aActive ? -1 : 1;
      if (aDone !== bDone) return aDone ? 1 : -1;
    }
    return 0;
  });

  return (
    <Wrapper>
      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "20px", position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <button onClick={() => { setStation(null); setData([]); setLocalEdits({}); if (pollRef.current) clearInterval(pollRef.current); }}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94A3B8", padding: "10px 14px", borderRadius: "10px", cursor: "pointer", fontSize: "13px" }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "18px", fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>{currentStation.icon} {currentStation.label}</div>
            <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
              {`${stats.scored}/${stats.total} scored`}
            </div>
          </div>
          <button onClick={() => fetchData()} style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: "#64748B", padding: "8px 12px", borderRadius: "10px", cursor: "pointer", fontSize: "12px",
          }}>🔄</button>
        </div>

        {/* Domain filter */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "16px", overflowX: "auto", paddingBottom: "4px" }}>
            {DOMAINS.map((d) => (
              <button key={d} onClick={() => setDomain(d)} style={{
                padding: "7px 14px", borderRadius: "8px", border: "none", cursor: "pointer",
                fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap", transition: "all 0.2s",
                background: domain === d ? `${currentStation.accent}25` : "rgba(255,255,255,0.04)",
                color: domain === d ? currentStation.accent : "#64748B",
              }}>{d}</button>
            ))}
          </div>

        {/* Loading */}
        {loading && (
          <div style={{ ...glass, padding: "40px", textAlign: "center" }}>
            <span style={{ width: "24px", height: "24px", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: currentStation.accent, borderRadius: "50%", display: "inline-block", animation: "cpspin 0.6s linear infinite" }} />
            <div style={{ marginTop: "12px", fontSize: "13px", color: "#64748B" }}>Loading candidates...</div>
          </div>
        )}

        {/* Empty */}
        {!loading && sorted.length === 0 && (
          <div style={{ ...glass, padding: "40px", textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.5 }}>📋</div>
            <div style={{ fontSize: "14px", color: "#64748B" }}>
              No candidates found for this domain.
            </div>
          </div>
        )}

        {/* Candidate rows */}
        {!loading && sorted.map((row) => {
          const isScored = !!(station === "panel" ? row.techScore : row.score);
          const isCheckedIn = row.checkin === "Yes";
          const isSaving = saving === row.rowIndex;
          const isSaved = savedRows[row.rowIndex];
          const hasTimer = timers[row.rowIndex];

          return (
            <div key={row.rowIndex} style={{
              ...glass, padding: "18px", marginBottom: "10px",
              borderColor: isSaved ? "rgba(34,197,94,0.3)" : isScored ? "rgba(34,197,94,0.1)" : isCheckedIn ? `${currentStation.accent}20` : "rgba(255,255,255,0.08)",
              background: isSaved ? "rgba(34,197,94,0.06)" : isScored ? "rgba(34,197,94,0.02)" : "rgba(255,255,255,0.04)",
              transition: "all 0.3s ease",
            }}>
              {/* Candidate info */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: (station === "panel" && isScored && !localEdits[`${row.rowIndex}-techScore`]) ? "0" : "14px" }}>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>{row.name}</div>
                  <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                    {row.domain}{row.jobRole ? ` • ${row.jobRole}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {isCheckedIn && <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "6px", background: "rgba(34,197,94,0.1)", color: "#4ADE80", fontWeight: 600 }}>Checked In</span>}
                  {isScored && <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "6px", background: "rgba(34,197,94,0.1)", color: "#4ADE80", fontWeight: 600 }}>✓ Scored</span>}
                </div>
              </div>

              {/* ── Panel Interview: special layout with timer ── */}
              {station === "panel" && (
                <>
                  {/* Scored candidates: collapsed view */}
                  {isScored && !localEdits[`${row.rowIndex}-techScore`] ? (
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ fontSize: "12px" }}><span style={{ color: "#475569" }}>Room </span><span style={{ color: "#F8FAFC", fontWeight: 600 }}>{row.room || "—"}</span></div>
                      <div style={{ fontSize: "12px" }}><span style={{ color: "#475569" }}>Slot </span><span style={{ color: "#F8FAFC", fontWeight: 600 }}>{row.timeSlot || "—"}</span></div>
                      <div style={{ marginLeft: "auto", display: "flex", gap: "12px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#22C55E" }}>Tech: {row.techScore}/10</span>
                        {row.pptScore && <span style={{ fontSize: "13px", fontWeight: 700, color: "#3B82F6" }}>PPT: {row.pptScore}/10</span>}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Interview details */}
                      <div style={{ display: "flex", gap: "12px", marginBottom: "14px", flexWrap: "wrap" }}>
                        <div style={{ fontSize: "12px" }}><span style={{ color: "#475569" }}>Room </span><span style={{ color: "#F8FAFC", fontWeight: 600 }}>{row.room || "—"}</span></div>
                        <div style={{ fontSize: "12px" }}><span style={{ color: "#475569" }}>Slot </span><span style={{ color: "#F8FAFC", fontWeight: 600 }}>{row.timeSlot || "—"}</span></div>
                      </div>

                      {/* Candidate check-in badge + Start Interview (separate actions) */}
                      {isCheckedIn && !hasTimer && !isScored && (
                        <div style={{ padding: "8px 12px", borderRadius: "8px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.1)", fontSize: "12px", color: "#4ADE80", marginBottom: "10px", textAlign: "center" }}>
                          Candidate has arrived
                        </div>
                      )}

                      {/* Start Interview button — only interviewer controls this */}
                      {!hasTimer && !isScored ? (
                        <button onClick={() => handlePanelCheckin(row)} disabled={isSaving} style={{
                          width: "100%", padding: "12px", borderRadius: "10px", border: "none",
                          background: isSaving ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #6366F1, #8B5CF6)",
                          color: "#FFF", fontSize: "14px", fontWeight: 700, fontFamily: "'Outfit', sans-serif",
                          cursor: isSaving ? "wait" : "pointer", marginBottom: "14px",
                        }}>{isSaving ? "Starting..." : "Start Interview →"}</button>
                      ) : (
                        hasTimer && !isScored && (
                          <div style={{ marginBottom: "14px", padding: "14px", borderRadius: "12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <InterviewTimer startTime={hasTimer} />
                          </div>
                        )
                      )}

                      {/* Score fields (show only after interviewer starts interview) */}
                      {(hasTimer || isScored) && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: "11px", color: "#64748B", display: "block", marginBottom: "4px" }}>Tech Score (1-10)</label>
                              <input type="number" min="1" max="10" value={getLocal(row.rowIndex, "techScore", row.techScore)} onChange={(e) => setLocal(row.rowIndex, "techScore", e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: "11px", color: "#64748B", display: "block", marginBottom: "4px" }}>PPT Score (1-10)</label>
                              <input type="number" min="1" max="10" value={getLocal(row.rowIndex, "pptScore", row.pptScore)} onChange={(e) => setLocal(row.rowIndex, "pptScore", e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: "11px", color: "#64748B", display: "block", marginBottom: "4px" }}>Tech Feedback</label>
                            <input type="text" value={getLocal(row.rowIndex, "techFeedback", row.techFeedback)} onChange={(e) => setLocal(row.rowIndex, "techFeedback", e.target.value)} placeholder="Feedback..." style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                          </div>
                          <div>
                            <label style={{ fontSize: "11px", color: "#64748B", display: "block", marginBottom: "4px" }}>PPT Feedback</label>
                            <input type="text" value={getLocal(row.rowIndex, "pptFeedback", row.pptFeedback)} onChange={(e) => setLocal(row.rowIndex, "pptFeedback", e.target.value)} placeholder="Feedback..." style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                          </div>
                          <button onClick={() => submitPanel(row)} disabled={isSaving} style={{
                            padding: "12px", borderRadius: "10px", border: "none",
                            background: isSaving ? "rgba(255,255,255,0.1)" : isSaved ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg, #6366F1, #8B5CF6)",
                            color: "#FFF", fontSize: "14px", fontWeight: 700, fontFamily: "'Outfit', sans-serif",
                            cursor: isSaving ? "wait" : "pointer",
                          }}>{isSaving ? "Submitting..." : isSaved ? "✓ Saved!" : "Submit Scores"}</button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* ── IA / Behavioural / Resume: inline scoring ── */}
              {station !== "panel" && (
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", flexWrap: "wrap" }}>
                  <div style={{ flex: "0 0 80px" }}>
                    <label style={{ fontSize: "11px", color: "#64748B", display: "block", marginBottom: "4px" }}>Score (1-10)</label>
                    <input type="number" min="1" max="10"
                      value={getLocal(row.rowIndex, "score", row.score)}
                      onChange={(e) => setLocal(row.rowIndex, "score", e.target.value)}
                      style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                    />
                  </div>

                  {/* Comments field for IA, Feedback for Behavioural, none for Resume */}
                  {station === "ia" && (
                    <div style={{ flex: 1, minWidth: "120px" }}>
                      <label style={{ fontSize: "11px", color: "#64748B", display: "block", marginBottom: "4px" }}>Comments</label>
                      <input type="text" value={getLocal(row.rowIndex, "comments", row.comments || "")} onChange={(e) => setLocal(row.rowIndex, "comments", e.target.value)} placeholder="Optional..." style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                    </div>
                  )}
                  {station === "behavioural" && (
                    <div style={{ flex: 1, minWidth: "120px" }}>
                      <label style={{ fontSize: "11px", color: "#64748B", display: "block", marginBottom: "4px" }}>Feedback</label>
                      <input type="text" value={getLocal(row.rowIndex, "feedback", row.feedback || "")} onChange={(e) => setLocal(row.rowIndex, "feedback", e.target.value)} placeholder="Optional..." style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                    </div>
                  )}

                  <button
                    onClick={() => station === "ia" ? submitIA(row) : station === "behavioural" ? submitBehavioural(row) : submitResume(row)}
                    disabled={isSaving || (isScored && !localEdits[`${row.rowIndex}-score`])}
                    style={{
                      padding: "10px 18px", borderRadius: "10px", border: "none",
                      background: isSaving ? "rgba(255,255,255,0.1)" : (isScored && !localEdits[`${row.rowIndex}-score`]) ? "rgba(34,197,94,0.15)" : isSaved ? "rgba(34,197,94,0.2)" : `linear-gradient(135deg, ${currentStation.accent}, ${currentStation.accent}CC)`,
                      color: (isScored && !localEdits[`${row.rowIndex}-score`]) ? "#4ADE80" : "#FFF",
                      fontSize: "13px", fontWeight: 700, fontFamily: "'Outfit', sans-serif",
                      cursor: (isSaving || (isScored && !localEdits[`${row.rowIndex}-score`])) ? "default" : "pointer", whiteSpace: "nowrap", flexShrink: 0,
                    }}
                  >
                    {isSaving ? "..." : (isScored && !localEdits[`${row.rowIndex}-score`]) ? "✓ Done" : isSaved ? "✓" : "Submit"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Wrapper>
  );
}