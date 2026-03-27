"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Constants ────────────────────────────────────────────────────────
const DOMAINS = ["All", "Data", "Computer Science", "AI / Machine Learning", "Cybersecurity", "Product / Project Management", "Bio / Pharma / Life Sciences", "Electrical / Hardware Engineering", "Finance", "Supply Chain", "Other"];
const TIME_SLOTS = ["11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM"];

const TABS = [
  { key: "overview", label: "Overview", icon: "📊" },
  { key: "frontdesk", label: "Front Desk", icon: "🚪" },
  { key: "ia", label: "IA Results", icon: "📝" },
  { key: "assign", label: "Assign", icon: "📋" },
  { key: "behavioural", label: "Behavioural", icon: "🗣️" },
  { key: "resume", label: "Resume", icon: "📄" },
  { key: "panel", label: "Panel", icon: "💼" },
];

const glass = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "16px",
};

const inputStyle = {
  padding: "10px 12px", borderRadius: "10px", fontSize: "13px",
  border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)",
  color: "#F8FAFC", outline: "none", fontFamily: "'DM Sans', sans-serif",
};

// ── Wrapper ──────────────────────────────────────────────────────────
function Wrapper({ children }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <div style={{ minHeight: "100vh", background: "#060B18", color: "#F8FAFC", fontFamily: "'DM Sans', sans-serif" }}>
        {children}
      </div>
      <style>{`
        @keyframes adspin { to { transform: rotate(360deg); } }
        .admin-select { appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px !important; }
        .admin-select option { background: #1E293B; color: #F8FAFC; padding: 8px; }
      `}</style>
    </>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ ...glass, padding: "18px", flex: 1, minWidth: "140px" }}>
      <div style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>{label}</div>
      <div style={{ fontSize: "24px", fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: color || "#F8FAFC" }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "#475569", marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
export default function AdminDashboard({ onBack }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState("All");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(null);
  const [savedItems, setSavedItems] = useState({});
  const pollRef = useRef(null);

  // ── Fetch all admin data ──
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/sheets?action=admin-all");
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch {}
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    pollRef.current = setInterval(() => fetchData(true), 60000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchData]);

  // ── Helpers ──
  function flashSaved(key) {
    setSavedItems((p) => ({ ...p, [key]: true }));
    setTimeout(() => setSavedItems((p) => { const n = { ...p }; delete n[key]; return n; }), 2000);
  }

  function filterByDomain(list) {
    if (domain === "All") return list;
    return list.filter((r) => r.domain === domain);
  }

  function filterBySearch(list) {
    if (!search.trim()) return list;
    const s = search.toLowerCase();
    return list.filter((r) => (r.name || "").toLowerCase().includes(s) || (r.email || "").toLowerCase().includes(s));
  }

  // ── Domain filter bar ──
  function DomainBar() {
    return (
      <div style={{ display: "flex", gap: "5px", overflowX: "auto", paddingBottom: "4px", marginBottom: "16px" }}>
        {DOMAINS.map((d) => (
          <button key={d} onClick={() => setDomain(d)} style={{
            padding: "6px 12px", borderRadius: "8px", border: "none", cursor: "pointer",
            fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap",
            background: domain === d ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)",
            color: domain === d ? "#A78BFA" : "#64748B",
          }}>{d}</button>
        ))}
      </div>
    );
  }

  // ── Front Desk: check in ──
  async function handleFrontDeskCheckin(candidate) {
    setSaving(candidate.email);
    try {
      await fetch("/api/update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "checkin-frontdesk",
          name: candidate.name, email: candidate.email,
          domain: candidate.domain, jobRole: candidate.jobRole,
        }),
      });
      flashSaved(candidate.email);
      await fetchData(true);
    } catch {}
    finally { setSaving(null); }
  }

  // ── IA: qualify/disqualify single candidate ──
  async function handleQualifySingle(rowIndex, qualified) {
    setSaving(`qualify-${rowIndex}`);
    try {
      await fetch("/api/update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "batch-qualify", updates: [{ rowIndex, qualified }] }),
      });
      flashSaved(`qualify-${rowIndex}`);
      await fetchData(true);
    } catch {}
    finally { setSaving(null); }
  }

  // ── IA: mark all remaining pending as Not Qualified ──
  async function handleMarkRestNotQualified() {
    const pending = (domain === "All" ? ia : ia.filter((r) => r.domain === domain))
      .filter((r) => r.email && r.score && r.qualified === "Pending");
    if (pending.length === 0) return;
    setSaving("mark-rest");
    try {
      const updates = pending.map((r) => ({ rowIndex: r.rowIndex, qualified: "No" }));
      await fetch("/api/update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "batch-qualify", updates }),
      });
      flashSaved("mark-rest");
      await fetchData(true);
    } catch {}
    finally { setSaving(null); }
  }

  // ── Assign interview ──
  async function handleAssignInterview(candidate, interviewer, timeSlot, room) {
    setSaving(candidate.email);
    try {
      await fetch("/api/update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          data: {
            name: candidate.name, email: candidate.email,
            domain: candidate.domain, jobRole: candidate.jobRole,
            interviewer, timeSlot, room, checkin: "No",
          },
        }),
      });
      flashSaved(candidate.email);
      await fetchData(true);
    } catch {}
    finally { setSaving(null); }
  }

  // ── Loading ──
  if (loading && !data) {
    return (
      <Wrapper>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <div style={{ textAlign: "center" }}>
            <span style={{ width: "32px", height: "32px", border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#A78BFA", borderRadius: "50%", display: "inline-block", animation: "adspin 0.6s linear infinite" }} />
            <div style={{ marginTop: "16px", color: "#64748B", fontSize: "14px" }}>Loading admin data...</div>
          </div>
        </div>
      </Wrapper>
    );
  }

  if (!data) return null;

  const { interviews = [], ia = [], behavioural = [], resume = [], frontDesk = [], helpers = [], settings = {}, threshold = 5 } = data;
  const interviewerList = settings.interviewers || [];
  const roomList = settings.rooms || [];

  // Already assigned emails (to avoid double-assigning)
  const assignedEmails = new Set(interviews.map((r) => r.email.toLowerCase().trim()));

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <Wrapper>
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "16px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 800, margin: 0, fontFamily: "'Outfit', sans-serif" }}>⚡ Admin Portal</h1>
            <p style={{ color: "#64748B", fontSize: "12px", margin: "4px 0 0" }}>Career Fair 2026</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => fetchData()} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748B", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px" }}>🔄</button>
            <button onClick={onBack} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748B", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px" }}>← Exit</button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: "4px", overflowX: "auto", marginBottom: "20px", paddingBottom: "4px" }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => { setActiveTab(t.key); setDomain("All"); setSearch(""); }} style={{
              padding: "8px 14px", borderRadius: "10px", border: "none", cursor: "pointer",
              fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap",
              background: activeTab === t.key ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.03)",
              color: activeTab === t.key ? "#A78BFA" : "#64748B",
              fontFamily: "'Outfit', sans-serif",
            }}>{t.icon} {t.label}</button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* OVERVIEW TAB                                           */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
              <StatCard label="Front Desk" value={`${frontDesk.filter((r) => r.checkedIn).length}/${frontDesk.length}`} sub="checked in" color="#4ADE80" />
              <StatCard label="IA Scored" value={`${ia.filter((r) => r.score).length}/${ia.filter((r) => r.email).length}`} sub={`threshold: ${threshold}`} color="#F59E0B" />
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
              <StatCard label="Qualified" value={ia.filter((r) => r.qualified === "Yes").length} sub="for panel interview" color="#22C55E" />
              <StatCard label="Interviews" value={`${interviews.filter((r) => r.techScore).length}/${interviews.length}`} sub="assigned" color="#6366F1" />
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
              <StatCard label="Behavioural" value={`${behavioural.filter((r) => r.score).length}/${behavioural.filter((r) => r.email).length}`} sub="scored" color="#EC4899" />
              <StatCard label="Resume" value={`${resume.filter((r) => r.score).length}/${resume.filter((r) => r.email).length}`} sub="scored" color="#14B8A6" />
            </div>

            {/* Per-domain breakdown */}
            <div style={{ ...glass, padding: "18px", marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "'Outfit', sans-serif", marginBottom: "14px" }}>Qualified by Domain</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {DOMAINS.filter((d) => d !== "All").map((d) => {
                  const domainIA = ia.filter((r) => r.domain === d && r.email);
                  const scored = domainIA.filter((r) => r.score).length;
                  const qualified = domainIA.filter((r) => r.qualified === "Yes").length;
                  const total = domainIA.length;
                  if (total === 0) return null;
                  return (
                    <div key={d} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.02)" }}>
                      <span style={{ fontSize: "13px", fontWeight: 500 }}>{d}</span>
                      <span style={{ fontSize: "12px", color: "#64748B" }}>
                        <span style={{ color: "#F59E0B" }}>{scored}/{total} scored</span>
                        {" · "}
                        <span style={{ color: "#22C55E" }}>{qualified} qualified</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* FRONT DESK TAB                                         */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === "frontdesk" && (
          <>
            <div style={{ marginBottom: "14px" }}>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
            </div>
            <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "12px" }}>
              {frontDesk.filter((r) => r.checkedIn).length}/{frontDesk.length} checked in
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filterBySearch(frontDesk).sort((a, b) => (a.checkedIn === b.checkedIn ? 0 : a.checkedIn ? 1 : -1)).map((c, i) => (
                <div key={i} style={{
                  ...glass, padding: "14px 16px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  borderColor: c.checkedIn ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)",
                  background: c.checkedIn ? "rgba(34,197,94,0.03)" : "rgba(255,255,255,0.04)",
                }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>{c.name}</div>
                    <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>{c.domain} · {c.jobRole}</div>
                  </div>
                  {c.checkedIn ? (
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "6px", background: "rgba(34,197,94,0.1)", color: "#4ADE80", fontWeight: 600 }}>✓ Checked In</span>
                      <div style={{ fontSize: "10px", color: "#475569", marginTop: "4px" }}>{c.checkInTime}</div>
                    </div>
                  ) : (
                    <button onClick={() => handleFrontDeskCheckin(c)} disabled={saving === c.email} style={{
                      padding: "8px 16px", borderRadius: "8px", border: "none",
                      background: saving === c.email ? "rgba(255,255,255,0.1)" : savedItems[c.email] ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg, #8B5CF6, #6366F1)",
                      color: "#FFF", fontSize: "12px", fontWeight: 700, cursor: saving === c.email ? "wait" : "pointer",
                      fontFamily: "'Outfit', sans-serif",
                    }}>{saving === c.email ? "..." : savedItems[c.email] ? "✓" : "Check In"}</button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* IA RESULTS TAB                                         */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === "ia" && (() => {
          const filtered = filterByDomain(ia).filter((r) => r.email).sort((a, b) => {
            const aScore = parseFloat(a.score) || 0;
            const bScore = parseFloat(b.score) || 0;
            return bScore - aScore; // descending
          });
          const scored = filtered.filter((r) => r.score).length;
          const qualifiedCount = filtered.filter((r) => r.qualified === "Yes").length;
          const notQualifiedCount = filtered.filter((r) => r.qualified === "No").length;
          const pendingCount = filtered.filter((r) => r.score && r.qualified === "Pending").length;

          return (
            <>
              <DomainBar />
              <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "14px" }}>
                <span style={{ color: "#F59E0B" }}>{scored} scored</span> · <span style={{ color: "#22C55E" }}>{qualifiedCount} qualified</span> · <span style={{ color: "#F87171" }}>{notQualifiedCount} not qualified</span>
                {pendingCount > 0 && <span> · <span style={{ color: "#F97316" }}>{pendingCount} pending</span></span>}
              </div>
              {pendingCount > 0 && (
                <button onClick={handleMarkRestNotQualified} disabled={saving === "mark-rest"} style={{
                  marginLeft: "auto", padding: "7px 16px", borderRadius: "8px",
                  border: "1px solid rgba(239,68,68,0.2)", background: saving === "mark-rest" ? "rgba(255,255,255,0.1)" : savedItems["mark-rest"] ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.08)",
                  color: savedItems["mark-rest"] ? "#4ADE80" : "#F87171",
                  fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif", whiteSpace: "nowrap",
                }}>{saving === "mark-rest" ? "Updating..." : savedItems["mark-rest"] ? "✓ Done" : `Mark Rest Not Qualified (${pendingCount})`}</button>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {filtered.map((row) => {
                  const isQualified = row.qualified === "Yes";
                  const isNotQualified = row.qualified === "No";
                  const hasScore = !!row.score;
                  const isSavingThis = saving === `qualify-${row.rowIndex}`;
                  const isSavedThis = savedItems[`qualify-${row.rowIndex}`];

                  return (
                    <div key={row.rowIndex} style={{
                      ...glass, padding: "14px 16px",
                      display: "flex", alignItems: "center", gap: "12px",
                      borderColor: isQualified ? "rgba(34,197,94,0.15)" : isNotQualified ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.08)",
                      background: isQualified ? "rgba(34,197,94,0.03)" : isNotQualified ? "rgba(239,68,68,0.02)" : "rgba(255,255,255,0.04)",
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "14px", fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>{row.name}</div>
                        <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>{row.domain}</div>
                        {row.comments && <div style={{ fontSize: "11px", color: "#475569", marginTop: "4px", fontStyle: "italic" }}>{row.comments}</div>}
                      </div>

                      {/* Score */}
                      <div style={{ textAlign: "center", flexShrink: 0, minWidth: "40px" }}>
                        {hasScore ? (
                          <div style={{ fontSize: "20px", fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: parseFloat(row.score) >= threshold ? "#22C55E" : "#F97316" }}>
                            {row.score}
                          </div>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#475569" }}>—</span>
                        )}
                      </div>

                      {/* Qualify / Disqualify button */}
                      <div style={{ flexShrink: 0 }}>
                        {!hasScore ? (
                          <span style={{ fontSize: "10px", color: "#475569" }}>No score</span>
                        ) : isSavingThis ? (
                          <span style={{ fontSize: "11px", color: "#64748B" }}>...</span>
                        ) : isSavedThis ? (
                          <span style={{ fontSize: "11px", color: "#4ADE80", fontWeight: 600 }}>✓ Updated</span>
                        ) : isQualified ? (
                          <button onClick={() => handleQualifySingle(row.rowIndex, "No")} style={{
                            padding: "6px 14px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.2)",
                            background: "rgba(239,68,68,0.08)", color: "#F87171",
                            fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                          }}>Disqualify</button>
                        ) : isNotQualified ? (
                          <button onClick={() => handleQualifySingle(row.rowIndex, "Yes")} style={{
                            padding: "6px 14px", borderRadius: "8px", border: "1px solid rgba(34,197,94,0.2)",
                            background: "rgba(34,197,94,0.08)", color: "#4ADE80",
                            fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                          }}>Qualify</button>
                        ) : (
                          <button onClick={() => handleQualifySingle(row.rowIndex, "Yes")} style={{
                            padding: "6px 14px", borderRadius: "8px", border: "none",
                            background: "linear-gradient(135deg, #22C55E, #16A34A)", color: "#FFF",
                            fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                          }}>Qualify</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ASSIGN INTERVIEWS TAB                                  */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === "assign" && (() => {
          const qualified = ia.filter((r) => r.qualified === "Yes" && r.email);
          // Merge jobRole from helpers
          const helperMap = {};
          helpers.forEach((h) => { if (h.email) helperMap[h.email.toLowerCase().trim()] = h; });
          const candidates = qualified.map((q) => {
            const helper = helperMap[(q.email || "").toLowerCase().trim()];
            return { ...q, jobRole: helper?.jobRole || "" };
          });
          const filtered = filterByDomain(candidates).filter((c) => !assignedEmails.has(c.email.toLowerCase().trim()));
          const alreadyAssigned = filterByDomain(candidates).filter((c) => assignedEmails.has(c.email.toLowerCase().trim()));

          return (
            <>
              <DomainBar />
              <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "12px" }}>
                <span style={{ color: "#F59E0B" }}>{filtered.length} to assign</span> · <span style={{ color: "#22C55E" }}>{alreadyAssigned.length} assigned</span>
              </div>

              {filtered.length === 0 && alreadyAssigned.length === 0 && (
                <div style={{ ...glass, padding: "40px", textAlign: "center" }}>
                  <div style={{ fontSize: "14px", color: "#64748B" }}>No qualified candidates for this domain yet.</div>
                </div>
              )}

              {/* Unassigned candidates */}
              {filtered.map((c) => (
                <AssignCard key={c.email} candidate={c} interviewerList={interviewerList} roomList={roomList}
                  saving={saving} savedItems={savedItems} onAssign={handleAssignInterview} />
              ))}

              {/* Already assigned */}
              {alreadyAssigned.length > 0 && (
                <div style={{ marginTop: "20px" }}>
                  <div style={{ fontSize: "12px", color: "#475569", fontWeight: 600, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Already Assigned</div>
                  {alreadyAssigned.map((c) => {
                    const interview = interviews.find((r) => r.email.toLowerCase().trim() === c.email.toLowerCase().trim());
                    return (
                      <div key={c.email} style={{ ...glass, padding: "14px 16px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", borderColor: "rgba(34,197,94,0.1)", background: "rgba(34,197,94,0.02)" }}>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>{c.name}</div>
                          <div style={{ fontSize: "11px", color: "#64748B" }}>{c.domain}</div>
                        </div>
                        <div style={{ textAlign: "right", fontSize: "11px", color: "#64748B" }}>
                          <div>{interview?.interviewer || "—"}</div>
                          <div>{interview?.timeSlot || "—"} · {interview?.room || "—"}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* BEHAVIOURAL TAB                                        */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === "behavioural" && (
          <>
            <DomainBar />
            <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "12px" }}>
              {filterByDomain(behavioural).filter((r) => r.score && r.email).length}/{filterByDomain(behavioural).filter((r) => r.email).length} scored
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filterByDomain(behavioural).filter((r) => r.email).sort((a, b) => (!!b.score === !!a.score ? 0 : b.score ? 1 : -1) * -1).map((row) => (
                <div key={row.rowIndex} style={{
                  ...glass, padding: "14px 16px",
                  borderColor: row.score ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.08)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>{row.name}</div>
                      <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>{row.domain}{row.room ? ` · Room ${row.room}` : ""}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {row.score ? (
                        <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: "#22C55E" }}>{row.score}/10</div>
                      ) : (
                        <span style={{ fontSize: "11px", padding: "4px 8px", borderRadius: "6px", background: "rgba(59,130,246,0.1)", color: "#60A5FA" }}>In Progress</span>
                      )}
                    </div>
                  </div>
                  {row.feedback && <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "8px", fontStyle: "italic", lineHeight: 1.5 }}>{row.feedback}</div>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* RESUME TAB                                             */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === "resume" && (
          <>
            <DomainBar />
            <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "12px" }}>
              {filterByDomain(resume).filter((r) => r.score && r.email).length}/{filterByDomain(resume).filter((r) => r.email).length} scored
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filterByDomain(resume).filter((r) => r.email).sort((a, b) => (!!b.score === !!a.score ? 0 : b.score ? 1 : -1) * -1).map((row) => (
                <div key={row.rowIndex} style={{
                  ...glass, padding: "14px 16px",
                  borderColor: row.score ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.08)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>{row.name}</div>
                      <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>{row.domain}{row.jobRole ? ` · ${row.jobRole}` : ""}</div>
                    </div>
                    <div>
                      {row.score ? (
                        <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: "#22C55E" }}>{row.score}/10</div>
                      ) : (
                        <span style={{ fontSize: "11px", padding: "4px 8px", borderRadius: "6px", background: "rgba(59,130,246,0.1)", color: "#60A5FA" }}>In Progress</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PANEL INTERVIEWS TAB                                   */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === "panel" && (
          <>
            <DomainBar />
            <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "12px" }}>
              {filterByDomain(interviews).filter((r) => r.techScore).length}/{filterByDomain(interviews).length} completed
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filterByDomain(interviews).sort((a, b) => {
                // Active first, then pending, then completed
                const aActive = a.checkin === "Yes" && !a.techScore;
                const bActive = b.checkin === "Yes" && !b.techScore;
                const aDone = !!a.techScore;
                const bDone = !!b.techScore;
                if (aActive !== bActive) return aActive ? -1 : 1;
                if (aDone !== bDone) return aDone ? 1 : -1;
                return 0;
              }).map((row) => {
                const isActive = row.checkin === "Yes" && !row.techScore;
                const isDone = !!row.techScore;
                return (
                  <div key={row.rowIndex} style={{
                    ...glass, padding: "14px 16px",
                    borderColor: isDone ? "rgba(34,197,94,0.1)" : isActive ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.08)",
                    background: isActive ? "rgba(59,130,246,0.03)" : isDone ? "rgba(34,197,94,0.02)" : "rgba(255,255,255,0.04)",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>{row.name}</div>
                        <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                          {row.domain} · {row.interviewer || "—"} · {row.timeSlot || "—"} · Room {row.room || "—"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {isDone ? (
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: 700, color: "#22C55E" }}>Tech: {row.techScore}/10</div>
                            {row.pptScore && <div style={{ fontSize: "13px", fontWeight: 700, color: "#3B82F6", marginTop: "2px" }}>PPT: {row.pptScore}/10</div>}
                          </div>
                        ) : isActive ? (
                          <span style={{ fontSize: "11px", padding: "4px 8px", borderRadius: "6px", background: "rgba(59,130,246,0.1)", color: "#60A5FA", fontWeight: 600 }}>In Progress</span>
                        ) : (
                          <span style={{ fontSize: "11px", padding: "4px 8px", borderRadius: "6px", background: "rgba(245,158,11,0.1)", color: "#FBBF24", fontWeight: 600 }}>Waiting</span>
                        )}
                      </div>
                    </div>
                    {(row.techFeedback || row.pptFeedback) && (
                      <div style={{ marginTop: "8px", fontSize: "12px", color: "#94A3B8", fontStyle: "italic", lineHeight: 1.5 }}>
                        {row.techFeedback && <div>Tech: {row.techFeedback}</div>}
                        {row.pptFeedback && <div>PPT: {row.pptFeedback}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>
    </Wrapper>
  );
}

// ══════════════════════════════════════════════════════════════════════
// ASSIGN CARD (used in Assign tab)
// ══════════════════════════════════════════════════════════════════════
function AssignCard({ candidate, interviewerList, roomList, saving, savedItems, onAssign }) {
  const [interviewer, setInterviewer] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [room, setRoom] = useState("");
  const isSaving = saving === candidate.email;
  const isSaved = savedItems[candidate.email];

  // Auto-fill room when interviewer is selected (matching Settings VLOOKUP logic)
  useEffect(() => {
    if (interviewer) {
      const idx = interviewerList.indexOf(interviewer);
      if (idx >= 0 && roomList[idx]) setRoom(roomList[idx]);
    }
  }, [interviewer, interviewerList, roomList]);

  return (
    <div style={{ ...glass, padding: "16px", marginBottom: "10px" }}>
      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontSize: "14px", fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>{candidate.name}</div>
        <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>{candidate.domain} · {candidate.jobRole} · IA: {candidate.score}/10</div>
      </div>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: "140px" }}>
          <label style={{ fontSize: "10px", color: "#64748B", display: "block", marginBottom: "6px" }}>Interviewer</label>
          <select className="admin-select" value={interviewer} onChange={(e) => setInterviewer(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", cursor: "pointer" }}>
            <option value="">Select interviewer...</option>
            {interviewerList.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{ flex: "0 0 130px" }}>
          <label style={{ fontSize: "10px", color: "#64748B", display: "block", marginBottom: "6px" }}>Time Slot</label>
          <select className="admin-select" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", cursor: "pointer" }}>
            <option value="">Select time...</option>
            {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ flex: "0 0 80px" }}>
          <label style={{ fontSize: "10px", color: "#64748B", display: "block", marginBottom: "6px" }}>Room</label>
          <input type="text" value={room} readOnly style={{ ...inputStyle, width: "100%", boxSizing: "border-box", color: "#94A3B8" }} />
        </div>
        <button
          onClick={() => { if (interviewer && timeSlot) onAssign(candidate, interviewer, timeSlot, room); }}
          disabled={!interviewer || !timeSlot || isSaving}
          style={{
            padding: "10px 16px", borderRadius: "8px", border: "none",
            background: (!interviewer || !timeSlot) ? "rgba(255,255,255,0.05)" : isSaving ? "rgba(255,255,255,0.1)" : isSaved ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg, #8B5CF6, #6366F1)",
            color: (!interviewer || !timeSlot) ? "#475569" : "#FFF",
            fontSize: "12px", fontWeight: 700, cursor: (!interviewer || !timeSlot || isSaving) ? "default" : "pointer",
            fontFamily: "'Outfit', sans-serif", whiteSpace: "nowrap", flexShrink: 0,
          }}
        >
          {isSaving ? "..." : isSaved ? "✓ Assigned" : "Assign"}
        </button>
      </div>
    </div>
  );
}