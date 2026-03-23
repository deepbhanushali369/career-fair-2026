"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const TIME_SLOTS = [
  "9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM",
  "12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM",
  "3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM",
];
const SCORES = ["1","2","3","4","5"];
const SCORE_LABELS = { "5": "Excellent", "4": "Great", "3": "Good", "2": "Fair", "1": "Needs Improvement" };
const SCORE_COLORS = { "5": "#22C55E", "4": "#3B82F6", "3": "#EAB308", "2": "#F97316", "1": "#EF4444" };

const pill = (active) => ({
  padding:"8px 14px", borderRadius:"8px", border:`1px solid ${active ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.08)"}`,
  background: active ? "rgba(59,130,246,0.15)" : "transparent", color: active ? "#60A5FA" : "#94A3B8",
  fontSize:"12px", cursor:"pointer", fontWeight:500,
});
const cellSel = {
  padding:"6px 8px", borderRadius:"6px", border:"1px solid rgba(255,255,255,0.08)",
  background:"rgba(0,0,0,0.2)", color:"#F8FAFC", fontSize:"12px", outline:"none", minWidth:"90px",
};
const cellInp = { ...cellSel, width:"140px" };
const formSel = {
  width:"100%", padding:"10px 12px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.1)",
  background:"rgba(0,0,0,0.3)", color:"#F8FAFC", fontSize:"14px", outline:"none",
};

function SearchableDropdown({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <input type="text" value={open ? search : value} placeholder={placeholder || "Search..."}
        onFocus={() => { setOpen(true); setSearch(""); }}
        onChange={(e) => setSearch(e.target.value)}
        style={formSel}
      />
      {open && (
        <div style={{
          position:"absolute", top:"100%", left:0, right:0, zIndex:50, marginTop:"4px",
          background:"#1E293B", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"8px",
          maxHeight:"200px", overflowY:"auto",
        }}>
          {filtered.length === 0 && <div style={{ padding:"10px 12px", color:"#64748B", fontSize:"13px" }}>No matches</div>}
          {filtered.map((o) => (
            <div key={o} onClick={() => { onChange(o); setOpen(false); setSearch(""); }}
              style={{ padding:"10px 12px", cursor:"pointer", fontSize:"13px", color:"#F8FAFC", borderBottom:"1px solid rgba(255,255,255,0.04)" }}
              onMouseEnter={(e) => e.target.style.background = "rgba(59,130,246,0.15)"}
              onMouseLeave={(e) => e.target.style.background = "transparent"}
            >{o}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard({ onBack }) {
  const [interviews, setInterviews] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [settings, setSettings] = useState({ interviewers: [], rooms: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRow, setNewRow] = useState({ name:"",email:"",areaOfInterest:"",interviewer:"",timeSlot:"",room:"",scorecard:"",feedback:"",checkin:"No" });
  const [filterCheckin, setFilterCheckin] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [intRes, helpRes, settRes] = await Promise.all([
        fetch("/api/sheets?action=all-interviews"),
        fetch("/api/sheets?action=helpers"),
        fetch("/api/sheets?action=settings"),
      ]);
      const [intData, helpData, settData] = await Promise.all([intRes.json(), helpRes.json(), settRes.json()]);
      setInterviews(Array.isArray(intData) ? intData : []);
      setCandidates(Array.isArray(helpData) ? helpData : []);
      setSettings({ interviewers: settData?.interviewers || [], rooms: settData?.rooms || [] });
    } catch (err) { console.error("Failed to load:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleUpdate(index, field, value) {
    const updated = [...interviews];
    updated[index] = { ...updated[index], [field]: value };
    setInterviews(updated);
    setSaving(index);
    try {
      await fetch("/api/update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", rowIndex: index, data: updated[index] }),
      });
    } catch (err) { console.error("Save failed:", err); }
    finally { setSaving(null); }
  }

  async function handleAddRow() {
    if (!newRow.name) return;
    setSaving("add");
    try {
      await fetch("/api/update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", data: newRow }),
      });
      await fetchData();
      setNewRow({ name:"",email:"",areaOfInterest:"",interviewer:"",timeSlot:"",room:"",scorecard:"",feedback:"",checkin:"No" });
      setShowAddForm(false);
    } catch (err) { console.error("Add failed:", err); }
    finally { setSaving(null); }
  }

  // Filter out already-assigned candidates from the dropdown
  const assignedNames = new Set(interviews.map((i) => i.name).filter(Boolean));
  const availableCandidates = candidates.filter((c) => !assignedNames.has(c.name));

  // Filter interviews for display
  const filtered = interviews.filter((row) => {
    if (filterCheckin !== "All") {
      if (filterCheckin === "Checked In" && row.checkin !== "Yes") return false;
      if (filterCheckin === "Not Checked In" && row.checkin === "Yes") return false;
    }
    if (searchTerm && !row.name.toLowerCase().includes(searchTerm.toLowerCase()) && !row.email.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Stats
  const totalCheckedIn = interviews.filter((i) => i.checkin === "Yes").length;
  const totalScored = interviews.filter((i) => i.scorecard).length;
  const stats = [
    { label: "Total", value: interviews.length, color: "#94A3B8" },
    { label: "Checked In", value: totalCheckedIn, color: "#3B82F6" },
    { label: "Scored", value: totalScored, color: "#22C55E" },
    { label: "Pending", value: interviews.length - totalCheckedIn, color: "#F59E0B" },
  ];

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", background:"#0B1120", color:"#F8FAFC", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:"32px", marginBottom:"12px" }}>⚡</div>
          <p style={{ color:"#94A3B8" }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#0B1120", color:"#F8FAFC", fontFamily:"'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ maxWidth:"1200px", margin:"0 auto", padding:"20px" }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"24px", flexWrap:"wrap", gap:"12px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
            {onBack && (
              <button onClick={onBack} style={{
                background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
                color:"#94A3B8", padding:"8px 14px", borderRadius:"10px", cursor:"pointer", fontSize:"14px",
              }}>← Menu</button>
            )}
            <div>
              <h1 style={{ fontSize:"20px", fontWeight:700, margin:0 }}>Interview Dashboard</h1>
              <p style={{ color:"#64748B", fontSize:"12px", margin:"2px 0 0" }}>{interviews.length} candidates</p>
            </div>
          </div>
          <div style={{ display:"flex", gap:"8px" }}>
            <button onClick={fetchData} style={{
              background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
              color:"#94A3B8", padding:"8px 14px", borderRadius:"10px", cursor:"pointer", fontSize:"13px",
            }}>🔄 Refresh</button>
            <button onClick={() => setShowAddForm(!showAddForm)} style={{
              background:"rgba(59,130,246,0.15)", border:"1px solid rgba(59,130,246,0.3)",
              color:"#60A5FA", padding:"8px 14px", borderRadius:"10px", cursor:"pointer", fontSize:"13px", fontWeight:600,
            }}>+ Assign Candidate</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))", gap:"10px", marginBottom:"20px" }}>
          {stats.map((s) => (
            <div key={s.label} style={{
              background:"rgba(255,255,255,0.04)", borderRadius:"12px",
              border:"1px solid rgba(255,255,255,0.06)", padding:"16px", textAlign:"center",
            }}>
              <div style={{ fontSize:"24px", fontWeight:700, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:"11px", color:"#64748B", marginTop:"4px" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div style={{
            background:"rgba(255,255,255,0.04)", borderRadius:"16px",
            border:"1px solid rgba(255,255,255,0.08)", padding:"24px", marginBottom:"20px",
          }}>
            <h3 style={{ fontSize:"16px", fontWeight:600, margin:"0 0 16px 0" }}>Assign New Candidate</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
              <div>
                <label style={{ fontSize:"12px", color:"#94A3B8", display:"block", marginBottom:"4px" }}>Candidate</label>
                <SearchableDropdown
                  options={availableCandidates.map((c) => c.name)}
                  value={newRow.name}
                  onChange={(name) => {
                    const c = candidates.find((x) => x.name === name);
                    setNewRow({ ...newRow, name, email: c?.email || "", areaOfInterest: c?.areaOfInterest || "" });
                  }}
                  placeholder="Search candidate..."
                />
              </div>
              <div>
                <label style={{ fontSize:"12px", color:"#94A3B8", display:"block", marginBottom:"4px" }}>Interviewer</label>
                <select value={newRow.interviewer} onChange={(e) => setNewRow({ ...newRow, interviewer: e.target.value })} style={formSel}>
                  <option value="">Select...</option>
                  {settings.interviewers.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:"12px", color:"#94A3B8", display:"block", marginBottom:"4px" }}>Time Slot</label>
                <select value={newRow.timeSlot} onChange={(e) => setNewRow({ ...newRow, timeSlot: e.target.value })} style={formSel}>
                  <option value="">Select...</option>
                  {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:"12px", color:"#94A3B8", display:"block", marginBottom:"4px" }}>Room</label>
                <select value={newRow.room} onChange={(e) => setNewRow({ ...newRow, room: e.target.value })} style={formSel}>
                  <option value="">Select...</option>
                  {settings.rooms.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:"flex", gap:"8px", marginTop:"16px" }}>
              <button onClick={handleAddRow} disabled={saving === "add" || !newRow.name} style={{
                padding:"10px 20px", borderRadius:"10px", border:"none", fontSize:"14px", fontWeight:600,
                cursor: newRow.name ? "pointer" : "not-allowed",
                background: newRow.name ? "linear-gradient(135deg, #3B82F6, #6366F1)" : "#334155",
                color:"#FFF", opacity: saving === "add" ? 0.7 : 1,
              }}>{saving === "add" ? "Adding..." : "Add Candidate"}</button>
              <button onClick={() => setShowAddForm(false)} style={{
                padding:"10px 20px", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.1)",
                background:"transparent", color:"#94A3B8", cursor:"pointer", fontSize:"14px",
              }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display:"flex", gap:"8px", marginBottom:"16px", flexWrap:"wrap", alignItems:"center" }}>
          {["All", "Checked In", "Not Checked In"].map((f) => (
            <button key={f} onClick={() => setFilterCheckin(f)} style={pill(filterCheckin === f)}>{f}</button>
          ))}
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
            style={{ ...cellInp, width:"220px", marginLeft:"auto" }}
          />
        </div>

        {/* Table */}
        <div style={{ overflowX:"auto", borderRadius:"12px", border:"1px solid rgba(255,255,255,0.06)" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"13px" }}>
            <thead>
              <tr style={{ background:"rgba(255,255,255,0.04)" }}>
                {["Name","Email","Domain","Interviewer","Time","Room","Score","Feedback","Check-in","Actions"].map((h) => (
                  <th key={h} style={{ padding:"12px 16px", textAlign:"left", color:"#64748B", fontSize:"11px", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, fi) => {
                // Find the real index in the full interviews array
                const ri = interviews.indexOf(row);
                return (
                  <tr key={ri} style={{ borderTop:"1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding:"12px 16px", fontWeight:500, whiteSpace:"nowrap" }}>{row.name}</td>
                    <td style={{ padding:"12px 16px", color:"#94A3B8", fontSize:"12px" }}>{row.email}</td>
                    <td style={{ padding:"12px 16px", color:"#94A3B8", fontSize:"12px" }}>{row.areaOfInterest}</td>
                    <td style={{ padding:"12px 16px" }}>
                      <select value={row.interviewer} onChange={(e) => handleUpdate(ri,"interviewer",e.target.value)} style={cellSel}>
                        <option value="">—</option>
                        {settings.interviewers.map((i) => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:"12px 16px" }}>
                      <select value={row.timeSlot} onChange={(e) => handleUpdate(ri,"timeSlot",e.target.value)} style={cellSel}>
                        <option value="">—</option>
                        {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:"12px 16px" }}>
                      <select value={row.room} onChange={(e) => handleUpdate(ri,"room",e.target.value)} style={cellSel}>
                        <option value="">—</option>
                        {settings.rooms.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:"12px 16px" }}>
                      <select value={row.scorecard} onChange={(e) => handleUpdate(ri,"scorecard",e.target.value)}
                        style={{ ...cellSel, color: SCORE_COLORS[row.scorecard] || "#94A3B8", fontWeight:600 }}>
                        <option value="">—</option>
                        {SCORES.map((s) => <option key={s} value={s}>{s} - {SCORE_LABELS[s]}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:"12px 16px" }}>
                      <input type="text" value={row.feedback} onChange={(e) => handleUpdate(ri,"feedback",e.target.value)}
                        placeholder="Add notes..." style={cellInp} />
                    </td>
                    <td style={{ padding:"12px 16px" }}>
                      <span style={{
                        padding:"4px 10px", borderRadius:"8px", fontSize:"11px", fontWeight:600,
                        background: row.checkin === "Yes" ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                        color: row.checkin === "Yes" ? "#22C55E" : "#F59E0B",
                      }}>
                        {row.checkin === "Yes" ? "✓ Yes" : "✗ No"}
                      </span>
                    </td>
                    <td style={{ padding:"12px 16px", display:"flex", gap:"6px", alignItems:"center" }}>
                      {saving === ri && <span style={{ color:"#22C55E", fontSize:"11px" }}>Saving...</span>}
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Remove ${row.name} from Active Interviews?`)) return;
                          setSaving(ri);
                          try {
                            await fetch("/api/update", {
                              method:"POST", headers:{"Content-Type":"application/json"},
                              body: JSON.stringify({ action:"delete", rowIndex: ri }),
                            });
                            await fetchData();
                          } catch (err) { console.error("Delete failed:", err); }
                          finally { setSaving(null); }
                        }}
                        style={{
                          background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)",
                          color:"#F87171", padding:"4px 10px", borderRadius:"6px", cursor:"pointer",
                          fontSize:"11px", whiteSpace:"nowrap",
                        }}
                      >🗑 Remove</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding:"48px", textAlign:"center", color:"#64748B" }}>
              No interviews found. Click &quot;+ Assign Candidate&quot; to add one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}