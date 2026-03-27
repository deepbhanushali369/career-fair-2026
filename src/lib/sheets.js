import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

const SHEET_IDS = {
  responses: "1uWyaj_cvz_4DiFjeAYfvQ26wHoOkoNhu8Lr_kGDOd7Y",
  master: "1TMF2fD5VBbUMFbgRQjstrwa4nnedt-_lB9ZbCCrDQRc",
  exhibitors: "1gfyqQtcas_JTf91Y6OxlXCkUgQi7uUXdnPui2a2eGXo",
};

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  return new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
}

function getSheets() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

// ── Core read/write helpers ──────────────────────────────────────────
export async function readSheet(sheetId, range) {
  const sheets = getSheets();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId, range, valueRenderOption: "FORMATTED_VALUE",
      });
      return res.data.values || [];
    } catch (err) {
      if (err.code === 429 && attempt < 2) {
        // Wait 2s, 4s before retry
        await new Promise((r) => setTimeout(r, (attempt + 1) * 2000));
        continue;
      }
      throw err;
    }
  }
  return [];
}

export async function writeSheet(sheetId, range, values) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId, range, valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
  return res.data;
}

export async function appendSheet(sheetId, range, values) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId, range, valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
  return res.data;
}

// ══════════════════════════════════════════════════════════════════════
// ACTIVE_INTERVIEWS (Panel Interview)
// A:Name | B:Email | C:Area of Interest | D:Job Role
// E:Interviewer Assigned | F:Room Number | G:Interview Time Slot
// H:Tech Score | I:Tech Feedback | J:PPT Score | K:PPT Feedback | L:Check-in
// All columns are plain text — only qualified candidates get added here
// ══════════════════════════════════════════════════════════════════════

export async function getAllInterviews() {
  const rows = await readSheet(SHEET_IDS.master, "Active_Interviews!A:L");
  if (!rows || rows.length < 2) return [];
  return rows.slice(1).filter((r) => r[0]).map((r, i) => ({
    rowIndex: i,
    name: r[0] || "", email: r[1] || "", domain: r[2] || "",
    jobRole: r[3] || "", interviewer: r[4] || "", room: r[5] || "",
    timeSlot: r[6] || "", techScore: r[7] || "", techFeedback: r[8] || "",
    pptScore: r[9] || "", pptFeedback: r[10] || "", checkin: r[11] || "No",
  }));
}

export async function getCandidateByEmail(email) {
  const rows = await readSheet(SHEET_IDS.master, "Active_Interviews!A:L");
  if (!rows || rows.length < 2) return null;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r[1] && r[1].toLowerCase().trim() === email.toLowerCase().trim()) {
      return {
        rowIndex: i - 1, sheetRow: i + 1,
        name: r[0] || "", email: r[1] || "", domain: r[2] || "",
        jobRole: r[3] || "", interviewer: r[4] || "", room: r[5] || "",
        timeSlot: r[6] || "", techScore: r[7] || "", techFeedback: r[8] || "",
        pptScore: r[9] || "", pptFeedback: r[10] || "", checkin: r[11] || "No",
      };
    }
  }
  return null;
}

const INTERVIEW_FIELD_MAP = {
  name: "A", email: "B", domain: "C", jobRole: "D",
  interviewer: "E", room: "F", timeSlot: "G",
  techScore: "H", techFeedback: "I",
  pptScore: "J", pptFeedback: "K",
  checkin: "L",
};

export async function updateInterviewRow(rowIndex, field, value) {
  const col = INTERVIEW_FIELD_MAP[field];
  if (!col) throw new Error(`Cannot write to field: ${field}`);
  await writeSheet(SHEET_IDS.master, `Active_Interviews!${col}${rowIndex + 2}`, [[value]]);
}

export async function addInterviewRow(data) {
  // Find first empty row (where column B is empty) — preserves Check-in dropdown in L
  const rows = await readSheet(SHEET_IDS.master, "Active_Interviews!A:L");
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][1] || rows[i][1].trim() === "") {
      const sheetRow = i + 1;
      // Write A:G (name through time slot) and L (check-in)
      await writeSheet(SHEET_IDS.master, `Active_Interviews!A${sheetRow}:G${sheetRow}`, [[
        data.name || "", data.email || "", data.domain || "", data.jobRole || "",
        data.interviewer || "", data.room || "", data.timeSlot || "",
      ]]);
      await writeSheet(SHEET_IDS.master, `Active_Interviews!L${sheetRow}`, [[data.checkin || "No"]]);
      return;
    }
  }
  // Fallback: append if no empty row
  await appendSheet(SHEET_IDS.master, "Active_Interviews!A:L", [[
    data.name || "", data.email || "", data.domain || "", data.jobRole || "",
    data.interviewer || "", data.room || "", data.timeSlot || "",
    data.techScore || "", data.techFeedback || "",
    data.pptScore || "", data.pptFeedback || "",
    data.checkin || "No",
  ]]);
}

export async function deleteInterviewRow(rowIndex) {
  const sheets = getSheets();
  const sheetRow = rowIndex + 1;
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_IDS.master });
  const sheet = meta.data.sheets.find((s) => s.properties.title === "Active_Interviews");
  if (!sheet) throw new Error("Active_Interviews tab not found");
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_IDS.master,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId: sheet.properties.sheetId, dimension: "ROWS", startIndex: sheetRow, endIndex: sheetRow + 1 },
        },
      }],
    },
  });
}

export async function getInterviewerCandidates(interviewerName) {
  const all = await getAllInterviews();
  return all.filter((r) =>
    r.interviewer.toLowerCase().trim() === interviewerName.toLowerCase().trim()
  );
}

// ══════════════════════════════════════════════════════════════════════
// FRONT_DESK (pre-populated from Helper_Candidates)
// A:Name(formula) | B:Email(formula) | C:Area of Interest(formula)
// D:Job Role(formula) | E:Checked In | F:Check In Time
// ⚠️ NEVER write to columns A, B, C, D — they are formulas
// ══════════════════════════════════════════════════════════════════════

export async function getFrontDeskStatus(email) {
  const rows = await readSheet(SHEET_IDS.master, "Front_Desk!A:F");
  if (!rows || rows.length < 2) return null;
  for (const r of rows.slice(1)) {
    if (r[1] && r[1].toLowerCase().trim() === email.toLowerCase().trim()) {
      return {
        name: r[0] || "", email: r[1] || "", domain: r[2] || "",
        jobRole: r[3] || "", checkedIn: (r[4] || "").toLowerCase() === "yes",
        checkInTime: r[5] || "",
      };
    }
  }
  return null;
}

export async function getAllFrontDesk() {
  const rows = await readSheet(SHEET_IDS.master, "Front_Desk!A:F");
  if (!rows || rows.length < 2) return [];
  return rows.slice(1).filter((r) => r[0]).map((r, i) => ({
    rowIndex: i, name: r[0] || "", email: r[1] || "", domain: r[2] || "",
    jobRole: r[3] || "", checkedIn: (r[4] || "").toLowerCase() === "yes",
    checkInTime: r[5] || "",
  }));
}

export async function checkInAtFrontDesk(name, email, domain, jobRole) {
  // Front_Desk is pre-populated — A:D are formulas from Helper_Candidates
  // Only write to E (Checked In) and F (Check In Time) — NEVER append rows
  const existing = await getFrontDeskStatus(email);
  if (existing && existing.checkedIn) return true; // already checked in

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // Find the row by email and update E:F
  const rows = await readSheet(SHEET_IDS.master, "Front_Desk!A:F");
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][1] && rows[i][1].toLowerCase().trim() === email.toLowerCase().trim()) {
      await writeSheet(SHEET_IDS.master, `Front_Desk!E${i + 1}:F${i + 1}`, [["Yes", timeStr]]);
      return true;
    }
  }
  return false; // candidate not found in Front_Desk
}

// ══════════════════════════════════════════════════════════════════════
// INITIAL ASSESSMENT (IA) — Tab: Initial_Assessment
// A:Name | B:Email | C:Domain | D:IA Score | E:Comments
// F:Qualified (formula from $I$1 threshold) | G:Checked In
// ⚠️ Column F is a formula — app overwrites with plain text during confirm
// Threshold value lives in I1, label in H1
// ══════════════════════════════════════════════════════════════════════

export async function getAllIA() {
  const rows = await readSheet(SHEET_IDS.master, "Initial_Assessment!A:G");
  if (!rows || rows.length < 2) return [];
  return rows.slice(1).filter((r) => r[0]).map((r, i) => ({
    rowIndex: i, name: r[0] || "", email: r[1] || "", domain: r[2] || "",
    score: r[3] || "", comments: r[4] || "",
    qualified: r[5] || "Pending", checkin: r[6] || "No",
  }));
}

export async function getIAByEmail(email) {
  const rows = await readSheet(SHEET_IDS.master, "Initial_Assessment!A:G");
  if (!rows || rows.length < 2) return null;
  for (const r of rows.slice(1)) {
    if (r[1] && r[1].toLowerCase().trim() === email.toLowerCase().trim()) {
      return {
        name: r[0] || "", email: r[1] || "", domain: r[2] || "",
        score: r[3] || "", comments: r[4] || "",
        qualified: r[5] || "Pending", checkin: r[6] || "No",
      };
    }
  }
  return null;
}

export async function checkinIA(name, email, domain) {
  const existing = await getIAByEmail(email);
  if (existing) return true;
  // If name/domain missing, look up from Helper_Candidates
  if (!name || !domain) {
    const helpers = await getHelperCandidates();
    const found = helpers.find((h) => h.email && h.email.toLowerCase().trim() === email.toLowerCase().trim());
    if (found) { name = name || found.name; domain = domain || found.areaOfInterest; }
  }
  // Find first empty row (where column B is empty) — don't append, fill from top
  // This preserves the Qualified formula in F and Check-in dropdown in G
  const rows = await readSheet(SHEET_IDS.master, "Initial_Assessment!A:G");
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][1] || rows[i][1].trim() === "") {
      const sheetRow = i + 1;
      // Write A:C (name, email, domain) and G (check-in) — leave D,E blank, don't touch F (formula)
      await writeSheet(SHEET_IDS.master, `Initial_Assessment!A${sheetRow}:C${sheetRow}`, [[name || "", email, domain || ""]]);
      await writeSheet(SHEET_IDS.master, `Initial_Assessment!G${sheetRow}`, [["Yes"]]);
      return true;
    }
  }
  // Fallback: if no empty row found, append (shouldn't happen if sheet has enough rows)
  await appendSheet(SHEET_IDS.master, "Initial_Assessment!A:G", [[name || "", email, domain || "", "", "", "", "Yes"]]);
  return true;
}

export async function updateIARow(rowIndex, field, value) {
  // D=score, E=comments, F=qualified (overwrite during confirm), G=checkin
  const colMap = { score: "D", comments: "E", qualified: "F", checkin: "G" };
  const col = colMap[field];
  if (!col) throw new Error(`Invalid IA field: ${field}`);
  await writeSheet(SHEET_IDS.master, `Initial_Assessment!${col}${rowIndex + 2}`, [[value]]);
}

// Score + comments in one call (for interviewer submit)
export async function submitIAScore(rowIndex, score, comments) {
  const sheetRow = rowIndex + 2;
  await writeSheet(SHEET_IDS.master, `Initial_Assessment!D${sheetRow}:E${sheetRow}`, [[score, comments]]);
}

export async function getIAThreshold() {
  const rows = await readSheet(SHEET_IDS.master, "Initial_Assessment!I1");
  if (!rows || !rows[0] || !rows[0][0]) return 5;
  return parseFloat(rows[0][0]) || 5;
}

export async function setIAThreshold(value) {
  await writeSheet(SHEET_IDS.master, "Initial_Assessment!I1", [[value]]);
}

// Batch qualify: array of { rowIndex, qualified: "Yes"|"No" }
export async function batchQualifyIA(updates) {
  const promises = updates.map((u) =>
    writeSheet(SHEET_IDS.master, `Initial_Assessment!F${u.rowIndex + 2}`, [[u.qualified]])
  );
  await Promise.all(promises);
}

// Get qualified candidates (for admin Assign Interviews tab)
// Merges IA data with Helper_Candidates to get jobRole
export async function getQualifiedCandidates() {
  const [iaRows, helpers] = await Promise.all([getAllIA(), getHelperCandidates()]);
  const qualified = iaRows.filter((r) => r.qualified === "Yes");
  // Merge jobRole from helpers
  const helperMap = {};
  helpers.forEach((h) => { if (h.email) helperMap[h.email.toLowerCase().trim()] = h; });
  return qualified.map((q) => {
    const helper = helperMap[(q.email || "").toLowerCase().trim()];
    return { ...q, jobRole: helper?.jobRole || "" };
  });
}

// ══════════════════════════════════════════════════════════════════════
// Behavioural_Interview Tab
// A:Name | B:Email | C:Domain | D:Room | E:Score | F:Feedback | G:Check-in
// ══════════════════════════════════════════════════════════════════════

export async function getAllBehavioural() {
  const rows = await readSheet(SHEET_IDS.master, "Behavioural_Interview!A:G");
  if (!rows || rows.length < 2) return [];
  return rows.slice(1).filter((r) => r[0]).map((r, i) => ({
    rowIndex: i, name: r[0] || "", email: r[1] || "", domain: r[2] || "",
    room: r[3] || "", score: r[4] || "", feedback: r[5] || "", checkin: r[6] || "No",
  }));
}

export async function getBehaviouralByEmail(email) {
  const rows = await readSheet(SHEET_IDS.master, "Behavioural_Interview!A:G");
  if (!rows || rows.length < 2) return null;
  for (const r of rows.slice(1)) {
    if (r[1] && r[1].toLowerCase().trim() === email.toLowerCase().trim()) {
      return {
        name: r[0] || "", email: r[1] || "", domain: r[2] || "",
        room: r[3] || "", score: r[4] || "", feedback: r[5] || "", checkin: r[6] || "No",
      };
    }
  }
  return null;
}

export async function checkinBehavioural(name, email, domain) {
  const existing = await getBehaviouralByEmail(email);
  if (existing) return true;
  if (!name || !domain) {
    const helpers = await getHelperCandidates();
    const found = helpers.find((h) => h.email && h.email.toLowerCase().trim() === email.toLowerCase().trim());
    if (found) { name = name || found.name; domain = domain || found.areaOfInterest; }
  }
  // Find first empty row (where column B is empty) — preserves Check-in dropdown in G
  const rows = await readSheet(SHEET_IDS.master, "Behavioural_Interview!A:G");
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][1] || rows[i][1].trim() === "") {
      const sheetRow = i + 1;
      await writeSheet(SHEET_IDS.master, `Behavioural_Interview!A${sheetRow}:C${sheetRow}`, [[name || "", email, domain || ""]]);
      await writeSheet(SHEET_IDS.master, `Behavioural_Interview!G${sheetRow}`, [["Yes"]]);
      return true;
    }
  }
  // Fallback
  await appendSheet(SHEET_IDS.master, "Behavioural_Interview!A:G", [[name || "", email, domain || "", "", "", "", "Yes"]]);
  return true;
}

export async function updateBehaviouralRow(rowIndex, field, value) {
  const colMap = { room: "D", score: "E", feedback: "F", checkin: "G" };
  const col = colMap[field];
  if (!col) throw new Error(`Invalid Behavioural field: ${field}`);
  await writeSheet(SHEET_IDS.master, `Behavioural_Interview!${col}${rowIndex + 2}`, [[value]]);
}

// Score + feedback in one call
export async function submitBehaviouralScore(rowIndex, score, feedback) {
  const sheetRow = rowIndex + 2;
  await writeSheet(SHEET_IDS.master, `Behavioural_Interview!E${sheetRow}:F${sheetRow}`, [[score, feedback]]);
}

// ══════════════════════════════════════════════════════════════════════
// Resume_Review Tab
// A:Name | B:Email | C:Domain | D:Job Role | E:Score | F:Checked In
// ══════════════════════════════════════════════════════════════════════

export async function getAllResume() {
  const rows = await readSheet(SHEET_IDS.master, "Resume_Review!A:F");
  if (!rows || rows.length < 2) return [];
  return rows.slice(1).filter((r) => r[0]).map((r, i) => ({
    rowIndex: i, name: r[0] || "", email: r[1] || "", domain: r[2] || "",
    jobRole: r[3] || "", score: r[4] || "", checkin: r[5] || "No",
  }));
}

export async function getResumeByEmail(email) {
  const rows = await readSheet(SHEET_IDS.master, "Resume_Review!A:F");
  if (!rows || rows.length < 2) return null;
  for (const r of rows.slice(1)) {
    if (r[1] && r[1].toLowerCase().trim() === email.toLowerCase().trim()) {
      return {
        name: r[0] || "", email: r[1] || "", domain: r[2] || "",
        jobRole: r[3] || "", score: r[4] || "", checkin: r[5] || "No",
      };
    }
  }
  return null;
}

export async function checkinResume(name, email, domain, jobRole) {
  const existing = await getResumeByEmail(email);
  if (existing) return true;
  if (!name || !domain || !jobRole) {
    const helpers = await getHelperCandidates();
    const found = helpers.find((h) => h.email && h.email.toLowerCase().trim() === email.toLowerCase().trim());
    if (found) { name = name || found.name; domain = domain || found.areaOfInterest; jobRole = jobRole || found.jobRole; }
  }
  // Find first empty row (where column B is empty) — preserves Check-in dropdown in F
  const rows = await readSheet(SHEET_IDS.master, "Resume_Review!A:F");
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][1] || rows[i][1].trim() === "") {
      const sheetRow = i + 1;
      await writeSheet(SHEET_IDS.master, `Resume_Review!A${sheetRow}:D${sheetRow}`, [[name || "", email, domain || "", jobRole || ""]]);
      await writeSheet(SHEET_IDS.master, `Resume_Review!F${sheetRow}`, [["Yes"]]);
      return true;
    }
  }
  // Fallback
  await appendSheet(SHEET_IDS.master, "Resume_Review!A:F", [[name || "", email, domain || "", jobRole || "", "", "Yes"]]);
  return true;
}

export async function updateResumeRow(rowIndex, field, value) {
  const colMap = { score: "E", checkin: "F" };
  const col = colMap[field];
  if (!col) throw new Error(`Invalid Resume field: ${field}`);
  await writeSheet(SHEET_IDS.master, `Resume_Review!${col}${rowIndex + 2}`, [[value]]);
}

// ══════════════════════════════════════════════════════════════════════
// Helper_Candidates & Settings
// ══════════════════════════════════════════════════════════════════════

export async function getHelperCandidates() {
  const rows = await readSheet(SHEET_IDS.master, "Helper_Candidates!A:D");
  if (!rows || rows.length < 2) return [];
  return rows.slice(1).filter((r) => r[0]).map((r) => ({
    name: r[0] || "", email: r[1] || "", areaOfInterest: r[2] || "", jobRole: r[3] || "",
  }));
}

export async function getSettings() {
  const rows = await readSheet(SHEET_IDS.master, "Settings!A:B");
  if (!rows) return { interviewers: [], rooms: [] };
  const interviewers = [], rooms = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]) interviewers.push(rows[i][0]);
    if (rows[i][1]) rooms.push(rows[i][1]);
  }
  return { interviewers, rooms };
}

// ══════════════════════════════════════════════════════════════════════
// EXHIBITORS (separate spreadsheet)
// A:First Name | B:Last Name | C:Company Name | D:Position
// E:Email Address | F:LinkedIn Profile | G:Headshot URL
// ══════════════════════════════════════════════════════════════════════

export async function getExhibitors() {
  const rows = await readSheet(SHEET_IDS.exhibitors, "Sheet1!A:G");
  if (!rows || rows.length < 2) return [];
  return rows.slice(1).filter((r) => r[0]).map((r) => ({
    firstName: r[0] || "", lastName: r[1] || "",
    company: r[2] || "", position: r[3] || "",
    email: r[4] || "", linkedin: r[5] || "",
    headshot: r[6] || "",
  }));
}

// ══════════════════════════════════════════════════════════════════════
// CANDIDATE JOURNEY — 4 stations: IA, Behavioural, Resume, Panel Interview
// ══════════════════════════════════════════════════════════════════════

export async function getCandidateJourney(email) {
  const [interview, ia, behavioural, resume, frontDesk] = await Promise.all([
    getCandidateByEmail(email),
    getIAByEmail(email),
    getBehaviouralByEmail(email),
    getResumeByEmail(email),
    getFrontDeskStatus(email),
  ]);

  if (!interview && !frontDesk && !ia) return null;

  // IA status
  let iaStatus = "Pending";
  if (ia) {
    iaStatus = (ia.score && ia.score !== "") ? "Completed" : "In Progress";
  }
  const iaQualified = ia ? (ia.qualified || "Pending") : "Pending";

  // Panel Interview status — gated by IA qualification
  let interviewStatus = "Locked";
  let interviewLockReason = "Selection based on Initial Assessment performance";
  if (iaQualified === "No") {
    interviewStatus = "Not Qualified";
    interviewLockReason = "Thank you for completing the IA. Continue building your profile at the other desks \u2014 your network and skills are what matter most today.";
  } else if (iaQualified === "Pending" && iaStatus === "Completed") {
    interviewStatus = "Pending Review";
    interviewLockReason = "Pending Review";
  } else if (iaQualified === "Yes") {
    if (!interview) {
      interviewStatus = "Qualified";
      interviewLockReason = "You\u2019ve qualified! Details will appear here shortly.";
    } else if (interview.checkin === "Yes") {
      interviewStatus = (interview.techScore && interview.techScore !== "") ? "Completed" : "In Progress";
      interviewLockReason = "";
    } else {
      interviewStatus = "Assigned";
      interviewLockReason = "";
    }
  }

  function stationStatus(data, scoreField = "score") {
    if (!data) return "Pending";
    if (data[scoreField] && data[scoreField] !== "") return "Completed";
    return "In Progress";
  }

  const statuses = {
    ia: iaStatus,
    behavioral: stationStatus(behavioural),
    resume: stationStatus(resume),
    interview: interviewStatus,
  };

  // If not qualified, total is 3 (IA, Behavioural, Resume only)
  const isNotQualified = iaQualified === "No";
  const totalStations = isNotQualified ? 3 : 4;

  const completedCount = [
    statuses.ia === "Completed",
    statuses.behavioral === "Completed",
    statuses.resume === "Completed",
    ...(!isNotQualified ? [statuses.interview === "Completed"] : []),
  ].filter(Boolean).length;

  return {
    name: interview?.name || frontDesk?.name || ia?.name || "",
    email: interview?.email || frontDesk?.email || ia?.email || email,
    domain: interview?.domain || frontDesk?.domain || ia?.domain || "",
    jobRole: interview?.jobRole || frontDesk?.jobRole || "",
    frontDeskCheckedIn: frontDesk ? frontDesk.checkedIn : false,
    progress: `${completedCount}/${totalStations}`,
    completedCount,
    totalStations,
    statuses,
    iaQualified,
    interviewLockReason,
    ia: ia || null,
    behavioral: behavioural || null,
    resume: resume || null,
    interview: interview || null,
  };
}