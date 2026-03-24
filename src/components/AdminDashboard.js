"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Constants ────────────────────────────────────────────────────────
const TIME_SLOTS = [
  "9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM",
  "12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM",
  "3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM",
];
const SCORES = ["1","2","3","4","5"];
const SCORE_LABELS = { "5":"Excellent","4":"Great","3":"Good","2":"Fair","1":"Needs Improvement" };
const SCORE_COLORS = { "5":"#22C55E","4":"#3B82F6","3":"#EAB308","2":"#F97316","1":"#EF4444" };

const TABS = [
  { key:"overview", label:"Overview", icon:"📊", color:"#8B5CF6" },
  { key:"interview", label:"Tech Interview", icon:"💻", color:"#3B82F6" },
  { key:"oa", label:"OA", icon:"📝", color:"#F59E0B" },
  { key:"behavioural", label:"Behavioural", icon:"🗣️", color:"#EC4899" },
  { key:"resume", label:"Resume", icon:"📄", color:"#14B8A6" },
  { key:"ppt", label:"PPT", icon:"📊", color:"#F97316" },
];

// ── Shared Styles ────────────────────────────────────────────────────
const cellSel = {
  padding:"6px 8px", borderRadius:"6px", border:"1px solid rgba(255,255,255,0.08)",
  background:"rgba(0,0,0,0.2)", color:"#F8FAFC", fontSize:"12px", outline:"none", minWidth:"80px",
};
const cellInp = { ...cellSel, width:"140px" };
const formSel = {
  width:"100%", padding:"10px 12px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.1)",
  background:"rgba(0,0,0,0.3)", color:"#F8FAFC", fontSize:"14px", outline:"none",
};

// ── Searchable Dropdown ──────────────────────────────────────────────
function SearchableDropdown({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
  return (
    <div ref={ref} style={{ position:"relative" }}>
      <input type="text" value={open ? search : value} placeholder={placeholder || "Search..."}
        onFocus={() => { setOpen(true); setSearch(""); }} onChange={(e) => setSearch(e.target.value)} style={formSel} />
      {open && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:50, marginTop:"4px",
          background:"#1E293B", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"8px", maxHeight:"200px", overflowY:"auto" }}>
          {filtered.length === 0 && <div style={{ padding:"10px 12px", color:"#64748B", fontSize:"13px" }}>No matches</div>}
          {filtered.map((o) => (
            <div key={o} onClick={() => { onChange(o); setOpen(false); setSearch(""); }}
              style={{ padding:"10px 12px", cursor:"pointer", fontSize:"13px", color:"#F8FAFC", borderBottom:"1px solid rgba(255,255,255,0.04)" }}
              onMouseEnter={(e) => e.target.style.background = "rgba(59,130,246,0.15)"}
              onMouseLeave={(e) => e.target.style.background = "transparent"}>{o}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Score Badge Component ────────────────────────────────────────────
function ScoreBadge({ score }) {
  if (!score) return <span style={{ color:"#475569", fontSize:"12px" }}>—</span>;
  const s = String(score);
  return (
    <span style={{
      padding:"3px 10px", borderRadius:"6px", fontSize:"12px", fontWeight:700,
      background:`${SCORE_COLORS[s] || "#64748B"}18`, color: SCORE_COLORS[s] || "#94A3B8",
    }}>{s}/5</span>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════

export default function AdminDashboard({ onBack }) {
  const [data, setData] = useState({ interviews:[], oa:[], behavioural:[], resume:[], ppt:[], helpers:[], settings:{ interviewers:[], rooms:[] } });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRow, setNewRow] = useState({ name:"",email:"",areaOfInterest:"",interviewer:"",timeSlot:"",room:"",scorecard:"",feedback:"",checkin:"No" });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/sheets?action=all-stations");
      const result = await res.json();
      setData({
        interviews: Array.isArray(result.interviews) ? result.interviews : [],
        oa: Array.isArray(result.oa) ? result.oa : [],
        behavioural: Array.isArray(result.behavioural) ? result.behavioural : [],
        resume: Array.isArray(result.resume) ? result.resume : [],
        ppt: Array.isArray(result.ppt) ? result.ppt : [],
        helpers: Array.isArray(result.helpers) ? result.helpers : [],
        settings: { interviewers: result.settings?.interviewers || [], rooms: result.settings?.rooms || [] },
      });
    } catch (err) { console.error("Failed to load:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Generic update handler ──
  async function handleStationUpdate(station, action, index, field, value) {
    // Optimistic update
    const key = station === "interview" ? "interviews" : station;
    const updated = [...data[key]];
    updated[index] = { ...updated[index], [field]: value };
    setData((prev) => ({ ...prev, [key]: updated }));
    setSaving(`${station}-${index}`);
    try {
      await fetch("/api/update", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ action, rowIndex: index, data: updated[index] }),
      });
    } catch (err) { console.error("Save failed:", err); }
    finally { setSaving(null); }
  }

  // ── Interview-specific handlers ──
  async function handleInterviewUpdate(index, field, value) {
    const updated = [...data.interviews];
    updated[index] = { ...updated[index], [field]: value };
    setData((prev) => ({ ...prev, interviews: updated }));
    setSaving(`interview-${index}`);
    try {
      await fetch("/api/update", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ action:"update", rowIndex: index, data: updated[index] }),
      });
    } catch (err) { console.error("Save failed:", err); }
    finally { setSaving(null); }
  }

  async function handleAddRow() {
    if (!newRow.name) return;
    setSaving("add");
    try {
      await fetch("/api/update", { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ action:"add", data: newRow }) });
      await fetchData();
      setNewRow({ name:"",email:"",areaOfInterest:"",interviewer:"",timeSlot:"",room:"",scorecard:"",feedback:"",checkin:"No" });
      setShowAddForm(false);
    } catch (err) { console.error("Add failed:", err); }
    finally { setSaving(null); }
  }

  async function handleDeleteInterview(index, name) {
    if (!window.confirm(`Remove ${name} from Active Interviews?`)) return;
    setSaving(`interview-${index}`);
    try {
      await fetch("/api/update", { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ action:"delete", rowIndex: index }) });
      await fetchData();
    } catch (err) { console.error("Delete failed:", err); }
    finally { setSaving(null); }
  }

  // Filter helpers
  const assignedNames = new Set(data.interviews.map((i) => i.name).filter(Boolean));
  const availableCandidates = data.helpers.filter((c) => !assignedNames.has(c.name));

  function filterList(list) {
    if (!searchTerm) return list;
    const s = searchTerm.toLowerCase();
    return list.filter((r) => (r.name || "").toLowerCase().includes(s) || (r.email || "").toLowerCase().includes(s));
  }

  // ── Stats for overview ──
  const overviewStats = {
    interview: { total: data.interviews.length, checkedIn: data.interviews.filter((i) => i.checkin === "Yes").length, scored: data.interviews.filter((i) => i.scorecard).length },
    oa: { total: data.oa.length, checkedIn: data.oa.length, scored: data.oa.filter((i) => i.score).length },
    behavioural: { total: data.behavioural.length, checkedIn: data.behavioural.length, scored: data.behavioural.filter((i) => i.score).length },
    resume: { total: data.resume.length, checkedIn: data.resume.length, scored: data.resume.filter((i) => i.score).length },
    ppt: { total: data.ppt.length, checkedIn: data.ppt.length, scored: data.ppt.filter((i) => i.score).length },
  };

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", background:"#0B1120", color:"#F8FAFC", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:"40px", marginBottom:"12px" }}>⚡</div>
          <p style={{ color:"#94A3B8", fontSize:"15px" }}>Loading all stations...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#0B1120", color:"#F8FAFC", fontFamily:"'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ maxWidth:"1280px", margin:"0 auto", padding:"16px 20px" }}>

        {/* ── Header ── */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px", flexWrap:"wrap", gap:"10px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
            {onBack && <button onClick={onBack} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"#94A3B8", padding:"8px 14px", borderRadius:"10px", cursor:"pointer", fontSize:"14px" }}>← Menu</button>}
            <div>
              <h1 style={{ fontSize:"20px", fontWeight:700, margin:0 }}>Admin Dashboard</h1>
              <p style={{ color:"#64748B", fontSize:"12px", margin:"2px 0 0" }}>Manage all stations</p>
            </div>
          </div>
          <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name or email..." style={{ ...cellInp, width:"200px" }} />
            <button onClick={fetchData} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"#94A3B8", padding:"8px 14px", borderRadius:"10px", cursor:"pointer", fontSize:"13px" }}>🔄</button>
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div style={{ display:"flex", gap:"4px", marginBottom:"20px", overflowX:"auto", paddingBottom:"4px" }}>
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding:"10px 16px", borderRadius:"10px 10px 0 0", border:"none", cursor:"pointer",
              fontSize:"13px", fontWeight:600, whiteSpace:"nowrap", transition:"all 0.2s",
              background: activeTab === tab.key ? `${tab.color}18` : "transparent",
              color: activeTab === tab.key ? tab.color : "#64748B",
              borderBottom: activeTab === tab.key ? `2px solid ${tab.color}` : "2px solid transparent",
            }}>
              {tab.icon} {tab.label}
              {tab.key !== "overview" && (
                <span style={{ marginLeft:"6px", padding:"2px 6px", borderRadius:"6px", fontSize:"11px",
                  background: activeTab === tab.key ? `${tab.color}25` : "rgba(255,255,255,0.06)",
                  color: activeTab === tab.key ? tab.color : "#64748B",
                }}>
                  {tab.key === "interview" ? data.interviews.length : (data[tab.key]?.length || 0)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:"12px", marginBottom:"24px" }}>
              {TABS.filter((t) => t.key !== "overview").map((tab) => {
                const st = overviewStats[tab.key] || { total:0, checkedIn:0, scored:0 };
                const pct = st.checkedIn > 0 ? Math.round((st.scored / st.checkedIn) * 100) : 0;
                return (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                    background:"rgba(255,255,255,0.04)", borderRadius:"16px", border:`1px solid ${tab.color}20`,
                    padding:"20px", textAlign:"left", cursor:"pointer", color:"#F8FAFC", transition:"all 0.2s",
                  }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
                      <span style={{ fontSize:"24px" }}>{tab.icon}</span>
                      <span style={{ fontSize:"11px", padding:"4px 8px", borderRadius:"6px", background:`${tab.color}15`, color:tab.color, fontWeight:600 }}>
                        {pct}% scored
                      </span>
                    </div>
                    <div style={{ fontSize:"15px", fontWeight:600, marginBottom:"8px" }}>{tab.label}</div>
                    <div style={{ display:"flex", gap:"16px" }}>
                      <div><span style={{ fontSize:"20px", fontWeight:700, color:tab.color }}>{st.checkedIn}</span><span style={{ fontSize:"11px", color:"#64748B", marginLeft:"4px" }}>checked in</span></div>
                      <div><span style={{ fontSize:"20px", fontWeight:700, color:"#22C55E" }}>{st.scored}</span><span style={{ fontSize:"11px", color:"#64748B", marginLeft:"4px" }}>scored</span></div>
                    </div>
                    {/* Mini progress bar */}
                    <div style={{ marginTop:"12px", height:"4px", borderRadius:"2px", background:"rgba(255,255,255,0.06)" }}>
                      <div style={{ height:"100%", borderRadius:"2px", background:tab.color, width:`${pct}%`, transition:"width 0.5s ease" }} />
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:"12px", border:"1px solid rgba(255,255,255,0.06)", padding:"20px", textAlign:"center", color:"#64748B", fontSize:"13px" }}>
              Click any station card above to manage it, or use the tabs at the top.
            </div>
          </div>
        )}

        {/* TECHNICAL INTERVIEW TAB */}
        {activeTab === "interview" && (
          <div>
            {/* Add Form Toggle */}
            <div style={{ display:"flex", gap:"8px", marginBottom:"16px" }}>
              <button onClick={() => setShowAddForm(!showAddForm)} style={{
                background:"rgba(59,130,246,0.15)", border:"1px solid rgba(59,130,246,0.3)",
                color:"#60A5FA", padding:"8px 16px", borderRadius:"10px", cursor:"pointer", fontSize:"13px", fontWeight:600,
              }}>+ Assign Candidate</button>
            </div>

            {/* Add Form */}
            {showAddForm && (
              <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:"16px", border:"1px solid rgba(255,255,255,0.08)", padding:"24px", marginBottom:"16px" }}>
                <h3 style={{ fontSize:"15px", fontWeight:600, margin:"0 0 16px 0" }}>Assign New Candidate</h3>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                  <div>
                    <label style={{ fontSize:"12px", color:"#94A3B8", display:"block", marginBottom:"4px" }}>Candidate</label>
                    <SearchableDropdown options={availableCandidates.map((c) => c.name)} value={newRow.name}
                      onChange={(name) => { const c = data.helpers.find((x) => x.name === name); setNewRow({ ...newRow, name, email:c?.email||"", areaOfInterest:c?.areaOfInterest||"" }); }}
                      placeholder="Search candidate..." />
                  </div>
                  <div>
                    <label style={{ fontSize:"12px", color:"#94A3B8", display:"block", marginBottom:"4px" }}>Interviewer</label>
                    <select value={newRow.interviewer} onChange={(e) => setNewRow({ ...newRow, interviewer:e.target.value })} style={formSel}>
                      <option value="">Select...</option>{data.settings.interviewers.map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:"12px", color:"#94A3B8", display:"block", marginBottom:"4px" }}>Time Slot</label>
                    <select value={newRow.timeSlot} onChange={(e) => setNewRow({ ...newRow, timeSlot:e.target.value })} style={formSel}>
                      <option value="">Select...</option>{TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:"12px", color:"#94A3B8", display:"block", marginBottom:"4px" }}>Room</label>
                    <select value={newRow.room} onChange={(e) => setNewRow({ ...newRow, room:e.target.value })} style={formSel}>
                      <option value="">Select...</option>{data.settings.rooms.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display:"flex", gap:"8px", marginTop:"16px" }}>
                  <button onClick={handleAddRow} disabled={!newRow.name || saving === "add"} style={{
                    padding:"10px 20px", borderRadius:"10px", border:"none", fontSize:"14px", fontWeight:600,
                    cursor:newRow.name ? "pointer":"not-allowed", background:newRow.name ? "linear-gradient(135deg, #3B82F6, #6366F1)":"#334155", color:"#FFF",
                  }}>{saving === "add" ? "Adding..." : "Add"}</button>
                  <button onClick={() => setShowAddForm(false)} style={{ padding:"10px 20px", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"#94A3B8", cursor:"pointer", fontSize:"14px" }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Interview Table */}
            <StationTable
              columns={["Name","Email","Domain","Interviewer","Time","Room","Score","Feedback","Check-in","Actions"]}
              rows={filterList(data.interviews)}
              allRows={data.interviews}
              saving={saving}
              renderRow={(row, fi, ri) => (
                <>
                  <Td>{row.name}</Td>
                  <Td sub>{row.email}</Td>
                  <Td sub>{row.areaOfInterest}</Td>
                  <Td>
                    <select value={row.interviewer} onChange={(e) => handleInterviewUpdate(ri,"interviewer",e.target.value)} style={cellSel}>
                      <option value="">—</option>{data.settings.interviewers.map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </Td>
                  <Td>
                    <select value={row.timeSlot} onChange={(e) => handleInterviewUpdate(ri,"timeSlot",e.target.value)} style={cellSel}>
                      <option value="">—</option>{TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Td>
                  <Td>
                    <select value={row.room} onChange={(e) => handleInterviewUpdate(ri,"room",e.target.value)} style={cellSel}>
                      <option value="">—</option>{data.settings.rooms.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </Td>
                  <Td>
                    <select value={row.scorecard} onChange={(e) => handleInterviewUpdate(ri,"scorecard",e.target.value)}
                      style={{ ...cellSel, color:SCORE_COLORS[row.scorecard]||"#94A3B8", fontWeight:600 }}>
                      <option value="">—</option>{SCORES.map((s) => <option key={s} value={s}>{s} - {SCORE_LABELS[s]}</option>)}
                    </select>
                  </Td>
                  <Td><input type="text" value={row.feedback} onChange={(e) => handleInterviewUpdate(ri,"feedback",e.target.value)} placeholder="Notes..." style={cellInp} /></Td>
                  <Td><CheckinBadge value={row.checkin} /></Td>
                  <Td>
                    <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
                      {saving === `interview-${ri}` && <span style={{ color:"#22C55E", fontSize:"11px" }}>Saving...</span>}
                      <button onClick={() => handleDeleteInterview(ri, row.name)} style={{
                        background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)",
                        color:"#F87171", padding:"4px 10px", borderRadius:"6px", cursor:"pointer", fontSize:"11px", whiteSpace:"nowrap",
                      }}>🗑</button>
                    </div>
                  </Td>
                </>
              )}
              emptyMessage="No interviews found. Click '+ Assign Candidate' to add one."
            />
          </div>
        )}

        {/* OA TAB */}
        {activeTab === "oa" && (
          <StationTable
            columns={["Name","Email","Domain","Score",""]}
            rows={filterList(data.oa)}
            allRows={data.oa}
            saving={saving}
            renderRow={(row, fi, ri) => (
              <>
                <Td>{row.name}</Td>
                <Td sub>{row.email}</Td>
                <Td sub>{row.domain}</Td>
                <Td>
                  <select value={row.score} onChange={(e) => handleStationUpdate("oa","update-oa",ri,"score",e.target.value)}
                    style={{ ...cellSel, color:SCORE_COLORS[row.score]||"#94A3B8", fontWeight:600 }}>
                    <option value="">—</option>{SCORES.map((s) => <option key={s} value={s}>{s} - {SCORE_LABELS[s]}</option>)}
                  </select>
                </Td>
                <Td>{saving === `oa-${ri}` && <span style={{ color:"#22C55E", fontSize:"11px" }}>Saving...</span>}</Td>
              </>
            )}
            emptyMessage="No candidates have checked in for OA yet."
          />
        )}

        {/* BEHAVIOURAL TAB */}
        {activeTab === "behavioural" && (
          <StationTable
            columns={["Name","Email","Domain","Room","Score","Feedback",""]}
            rows={filterList(data.behavioural)}
            allRows={data.behavioural}
            saving={saving}
            renderRow={(row, fi, ri) => (
              <>
                <Td>{row.name}</Td>
                <Td sub>{row.email}</Td>
                <Td sub>{row.domain}</Td>
                <Td><input type="text" value={row.room} onChange={(e) => handleStationUpdate("behavioural","update-behavioural",ri,"room",e.target.value)} placeholder="Room..." style={{ ...cellInp, width:"80px" }} /></Td>
                <Td>
                  <select value={row.score} onChange={(e) => handleStationUpdate("behavioural","update-behavioural",ri,"score",e.target.value)}
                    style={{ ...cellSel, color:SCORE_COLORS[row.score]||"#94A3B8", fontWeight:600 }}>
                    <option value="">—</option>{SCORES.map((s) => <option key={s} value={s}>{s} - {SCORE_LABELS[s]}</option>)}
                  </select>
                </Td>
                <Td><input type="text" value={row.feedback} onChange={(e) => handleStationUpdate("behavioural","update-behavioural",ri,"feedback",e.target.value)} placeholder="Feedback..." style={cellInp} /></Td>
                <Td>{saving === `behavioural-${ri}` && <span style={{ color:"#22C55E", fontSize:"11px" }}>Saving...</span>}</Td>
              </>
            )}
            emptyMessage="No candidates have checked in for Behavioural Interview yet."
          />
        )}

        {/* RESUME TAB */}
        {activeTab === "resume" && (
          <StationTable
            columns={["Name","Email","Domain","Score","Notes",""]}
            rows={filterList(data.resume)}
            allRows={data.resume}
            saving={saving}
            renderRow={(row, fi, ri) => (
              <>
                <Td>{row.name}</Td>
                <Td sub>{row.email}</Td>
                <Td sub>{row.domain}</Td>
                <Td>
                  <select value={row.score} onChange={(e) => handleStationUpdate("resume","update-resume",ri,"score",e.target.value)}
                    style={{ ...cellSel, color:SCORE_COLORS[row.score]||"#94A3B8", fontWeight:600 }}>
                    <option value="">—</option>{SCORES.map((s) => <option key={s} value={s}>{s} - {SCORE_LABELS[s]}</option>)}
                  </select>
                </Td>
                <Td><input type="text" value={row.notes} onChange={(e) => handleStationUpdate("resume","update-resume",ri,"notes",e.target.value)} placeholder="Keywords / notes..." style={{ ...cellInp, width:"180px" }} /></Td>
                <Td>{saving === `resume-${ri}` && <span style={{ color:"#22C55E", fontSize:"11px" }}>Saving...</span>}</Td>
              </>
            )}
            emptyMessage="No candidates have checked in for Resume Review yet."
          />
        )}

        {/* PPT TAB */}
        {activeTab === "ppt" && (
          <StationTable
            columns={["Name","Email","Domain","Score","Feedback",""]}
            rows={filterList(data.ppt)}
            allRows={data.ppt}
            saving={saving}
            renderRow={(row, fi, ri) => (
              <>
                <Td>{row.name}</Td>
                <Td sub>{row.email}</Td>
                <Td sub>{row.domain}</Td>
                <Td>
                  <select value={row.score} onChange={(e) => handleStationUpdate("ppt","update-ppt",ri,"score",e.target.value)}
                    style={{ ...cellSel, color:SCORE_COLORS[row.score]||"#94A3B8", fontWeight:600 }}>
                    <option value="">—</option>{SCORES.map((s) => <option key={s} value={s}>{s} - {SCORE_LABELS[s]}</option>)}
                  </select>
                </Td>
                <Td><input type="text" value={row.feedback} onChange={(e) => handleStationUpdate("ppt","update-ppt",ri,"feedback",e.target.value)} placeholder="Feedback..." style={cellInp} /></Td>
                <Td>{saving === `ppt-${ri}` && <span style={{ color:"#22C55E", fontSize:"11px" }}>Saving...</span>}</Td>
              </>
            )}
            emptyMessage="No candidates have checked in for PPT Presentation yet."
          />
        )}

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════════════

function Td({ children, sub }) {
  return <td style={{ padding:"12px 14px", fontSize: sub ? "12px":"13px", color: sub ? "#94A3B8":"#F8FAFC", fontWeight: sub ? 400:500, whiteSpace:"nowrap" }}>{children}</td>;
}

function CheckinBadge({ value }) {
  const yes = value === "Yes";
  return (
    <span style={{
      padding:"4px 10px", borderRadius:"8px", fontSize:"11px", fontWeight:600,
      background: yes ? "rgba(34,197,94,0.12)":"rgba(245,158,11,0.12)",
      color: yes ? "#22C55E":"#F59E0B",
    }}>{yes ? "✓ Yes":"✗ No"}</span>
  );
}

function StationTable({ columns, rows, allRows, saving, renderRow, emptyMessage }) {
  return (
    <div style={{ overflowX:"auto", borderRadius:"12px", border:"1px solid rgba(255,255,255,0.06)" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"13px" }}>
        <thead>
          <tr style={{ background:"rgba(255,255,255,0.04)" }}>
            {columns.map((h, i) => (
              <th key={i} style={{ padding:"12px 14px", textAlign:"left", color:"#64748B", fontSize:"11px", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", whiteSpace:"nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, fi) => {
            const ri = allRows.indexOf(row);
            return (
              <tr key={ri} style={{ borderTop:"1px solid rgba(255,255,255,0.04)" }}>
                {renderRow(row, fi, ri)}
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div style={{ padding:"48px", textAlign:"center", color:"#64748B", fontSize:"14px" }}>{emptyMessage}</div>
      )}
    </div>
  );
}