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
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId, range, valueRenderOption: "FORMATTED_VALUE",
  });
  return res.data.values || [];
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
// ACTIVE_INTERVIEWS (Technical Interview)
// A:Name(formula) | B:Email(formula) | C:Area of Interest(formula)
// D:Job Role(formula) | E:Interviewer Assigned | F:Room Number(VLOOKUP)
// G:Interview Time Slot | H:Tech Score | I:Tech Feedback
// J:PPT Score | K:PPT Feedback | L:Check-in
// ⚠️ NEVER write to columns A, B, C, D, F — they are formulas
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
        rowIndex: i - 1,
        sheetRow: i + 1, // actual sheet row number (1-indexed + header)
        name: r[0] || "", email: r[1] || "", domain: r[2] || "",
        jobRole: r[3] || "", interviewer: r[4] || "", room: r[5] || "",
        timeSlot: r[6] || "", techScore: r[7] || "", techFeedback: r[8] || "",
        pptScore: r[9] || "", pptFeedback: r[10] || "", checkin: r[11] || "No",
      };
    }
  }
  return null;
}

// Map field names to sheet columns (only writable ones)
const INTERVIEW_FIELD_MAP = {
  interviewer: "E", timeSlot: "G",
  techScore: "H", techFeedback: "I",
  pptScore: "J", pptFeedback: "K",
  checkin: "L",
};

export async function updateInterviewRow(rowIndex, field, value) {
  const col = INTERVIEW_FIELD_MAP[field];
  if (!col) throw new Error(`Cannot write to field: ${field}`);
  const sheetRow = rowIndex + 2; // +1 for header, +1 for 1-indexed
  await writeSheet(SHEET_IDS.master, `Active_Interviews!${col}${sheetRow}`, [[value]]);
}

export async function addInterviewRow(data) {
  // Only append writable columns E, G, H, I, J, K, L
  // Rows A-D are formulas pulling from Helper_Candidates, F is VLOOKUP
  // We append a full row but leave formula columns blank — they auto-fill
  await appendSheet(SHEET_IDS.master, "Active_Interviews!A:L", [[
    "", "", "", "",                           // A-D: formulas (leave blank)
    data.interviewer || "",                   // E: Interviewer
    "",                                       // F: Room (VLOOKUP, leave blank)
    data.timeSlot || "",                      // G: Time Slot
    data.techScore || "",                     // H: Tech Score
    data.techFeedback || "",                  // I: Tech Feedback
    data.pptScore || "",                      // J: PPT Score
    data.pptFeedback || "",                   // K: PPT Feedback
    data.checkin || "No",                     // L: Check-in
  ]]);
}

export async function deleteInterviewRow(rowIndex) {
  const sheets = getSheets();
  const sheetRow = rowIndex + 1; // 0-indexed for batchUpdate (skip header)
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_IDS.master });
  const sheet = meta.data.sheets.find((s) => s.properties.title === "Active_Interviews");
  if (!sheet) throw new Error("Active_Interviews tab not found");
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_IDS.master,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: "ROWS",
            startIndex: sheetRow,
            endIndex: sheetRow + 1,
          },
        },
      }],
    },
  });
}

// Get candidates assigned to a specific interviewer
export async function getInterviewerCandidates(interviewerName) {
  const all = await getAllInterviews();
  return all.filter((r) =>
    r.interviewer.toLowerCase().trim() === interviewerName.toLowerCase().trim()
  );
}

// ══════════════════════════════════════════════════════════════════════
// FRONT_DESK
// A:Name | B:Email | C:Area of Interest | D:Job Role
// E:Checked In | F:Check In Time
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
  // Check if already exists
  const existing = await getFrontDeskStatus(email);
  if (existing && existing.checkedIn) return true;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  if (existing) {
    // Row exists but not checked in — find and update
    const rows = await readSheet(SHEET_IDS.master, "Front_Desk!A:F");
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] && rows[i][1].toLowerCase().trim() === email.toLowerCase().trim()) {
        const sheetRow = i + 1;
        await writeSheet(SHEET_IDS.master, `Front_Desk!E${sheetRow}:F${sheetRow}`, [["Yes", timeStr]]);
        return true;
      }
    }
  }

  // New row
  await appendSheet(SHEET_IDS.master, "Front_Desk!A:F", [
    [name, email, domain, jobRole, "Yes", timeStr],
  ]);
  return true;
}

// ══════════════════════════════════════════════════════════════════════
// OA Tab
// A:Name | B:Email | C:Domain | D:OA Score | E:Check-in
// ══════════════════════════════════════════════════════════════════════

export async function getAllOA() {
  const rows = await readSheet(SHEET_IDS.master, "OA!A:E");
  if (!rows || rows.length < 2) return [];
  return rows.slice(1).filter((r) => r[0]).map((r, i) => ({
    rowIndex: i, name: r[0] || "", email: r[1] || "", domain: r[2] || "",
    score: r[3] || "", checkin: r[4] || "No",
  }));
}

export async function getOAByEmail(email) {
  const rows = await readSheet(SHEET_IDS.master, "OA!A:E");
  if (!rows || rows.length < 2) return null;
  for (const r of rows.slice(1)) {
    if (r[1] && r[1].toLowerCase().trim() === email.toLowerCase().trim()) {
      return { name: r[0] || "", email: r[1] || "", domain: r[2] || "", score: r[3] || "", checkin: r[4] || "No" };
    }
  }
  return null;
}

export async function checkinOA(name, email, domain) {
  const existing = await getOAByEmail(email);
  if (existing) return true;
  await appendSheet(SHEET_IDS.master, "OA!A:E", [[name, email, domain, "", "Yes"]]);
  return true;
}

export async function updateOARow(rowIndex, field, value) {
  const colMap = { score: "D", checkin: "E" };
  const col = colMap[field];
  if (!col) throw new Error(`Invalid OA field: ${field}`);
  await writeSheet(SHEET_IDS.master, `OA!${col}${rowIndex + 2}`, [[value]]);
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
  await appendSheet(SHEET_IDS.master, "Behavioural_Interview!A:G", [[name, email, domain, "", "", "", "Yes"]]);
  return true;
}

export async function updateBehaviouralRow(rowIndex, field, value) {
  const colMap = { room: "D", score: "E", feedback: "F", checkin: "G" };
  const col = colMap[field];
  if (!col) throw new Error(`Invalid Behavioural field: ${field}`);
  await writeSheet(SHEET_IDS.master, `Behavioural_Interview!${col}${rowIndex + 2}`, [[value]]);
}

// ══════════════════════════════════════════════════════════════════════
// Resume_Review Tab
// A:Name | B:Email | C:Domain | D:Score | E:Notes | F:Check-in
// ══════════════════════════════════════════════════════════════════════

export async function getAllResume() {
  const rows = await readSheet(SHEET_IDS.master, "Resume_Review!A:F");
  if (!rows || rows.length < 2) return [];
  return rows.slice(1).filter((r) => r[0]).map((r, i) => ({
    rowIndex: i, name: r[0] || "", email: r[1] || "", domain: r[2] || "",
    score: r[3] || "", notes: r[4] || "", checkin: r[5] || "No",
  }));
}

export async function getResumeByEmail(email) {
  const rows = await readSheet(SHEET_IDS.master, "Resume_Review!A:F");
  if (!rows || rows.length < 2) return null;
  for (const r of rows.slice(1)) {
    if (r[1] && r[1].toLowerCase().trim() === email.toLowerCase().trim()) {
      return { name: r[0] || "", email: r[1] || "", domain: r[2] || "", score: r[3] || "", notes: r[4] || "", checkin: r[5] || "No" };
    }
  }
  return null;
}

export async function checkinResume(name, email, domain) {
  const existing = await getResumeByEmail(email);
  if (existing) return true;
  await appendSheet(SHEET_IDS.master, "Resume_Review!A:F", [[name, email, domain, "", "", "Yes"]]);
  return true;
}

export async function updateResumeRow(rowIndex, field, value) {
  const colMap = { score: "D", notes: "E", checkin: "F" };
  const col = colMap[field];
  if (!col) throw new Error(`Invalid Resume field: ${field}`);
  await writeSheet(SHEET_IDS.master, `Resume_Review!${col}${rowIndex + 2}`, [[value]]);
}

// ══════════════════════════════════════════════════════════════════════
// PPT_Presentation Tab
// A:Name | B:Email | C:Domain | D:Score | E:Feedback | F:Check-in
// ══════════════════════════════════════════════════════════════════════

export async function getAllPPT() {
  const rows = await readSheet(SHEET_IDS.master, "PPT_Presentation!A:F");
  if (!rows || rows.length < 2) return [];
  return rows.slice(1).filter((r) => r[0]).map((r, i) => ({
    rowIndex: i, name: r[0] || "", email: r[1] || "", domain: r[2] || "",
    score: r[3] || "", feedback: r[4] || "", checkin: r[5] || "No",
  }));
}

export async function getPPTByEmail(email) {
  const rows = await readSheet(SHEET_IDS.master, "PPT_Presentation!A:F");
  if (!rows || rows.length < 2) return null;
  for (const r of rows.slice(1)) {
    if (r[1] && r[1].toLowerCase().trim() === email.toLowerCase().trim()) {
      return { name: r[0] || "", email: r[1] || "", domain: r[2] || "", score: r[3] || "", feedback: r[4] || "", checkin: r[5] || "No" };
    }
  }
  return null;
}

export async function checkinPPT(name, email, domain) {
  const existing = await getPPTByEmail(email);
  if (existing) return true;
  await appendSheet(SHEET_IDS.master, "PPT_Presentation!A:F", [[name, email, domain, "", "", "Yes"]]);
  return true;
}

export async function updatePPTRow(rowIndex, field, value) {
  const colMap = { score: "D", feedback: "E", checkin: "F" };
  const col = colMap[field];
  if (!col) throw new Error(`Invalid PPT field: ${field}`);
  await writeSheet(SHEET_IDS.master, `PPT_Presentation!${col}${rowIndex + 2}`, [[value]]);
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
// E:Email Address | F:LinkedIn Profile
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
// CANDIDATE JOURNEY (aggregates all data for one candidate)
// ══════════════════════════════════════════════════════════════════════

export async function getCandidateJourney(email) {
  const [interview, oa, behavioural, resume, ppt, frontDesk] = await Promise.all([
    getCandidateByEmail(email),
    getOAByEmail(email),
    getBehaviouralByEmail(email),
    getResumeByEmail(email),
    getPPTByEmail(email),
    getFrontDeskStatus(email),
  ]);

  if (!interview && !frontDesk) return null; // candidate not found at all

  // Interview status uses check-in column
  let interviewStatus = "Pending";
  if (interview) {
    if (interview.checkin === "Yes") {
      interviewStatus = (interview.techScore && interview.techScore !== "") ? "Completed" : "In Progress";
    }
    // If checkin is "No" but row exists, still Pending (assigned but not arrived)
  }

  // Other stations: row exists = checked in
  function stationStatus(data, scoreField = "score") {
    if (!data) return "Pending";
    if (data[scoreField] && data[scoreField] !== "") return "Completed";
    return "In Progress";
  }

  const statuses = {
    oa: stationStatus(oa),
    interview: interviewStatus,
    behavioral: stationStatus(behavioural),
    resume: stationStatus(resume),
    ppt: stationStatus(ppt),
  };

  const completedCount = Object.values(statuses).filter((s) => s === "Completed").length;

  return {
    name: interview?.name || frontDesk?.name || "",
    email: interview?.email || frontDesk?.email || email,
    domain: interview?.domain || frontDesk?.domain || "",
    jobRole: interview?.jobRole || frontDesk?.jobRole || "",
    frontDeskCheckedIn: frontDesk ? frontDesk.checkedIn : false,
    progress: `${completedCount}/5`,
    completedCount,
    statuses,
    interview: interview || null,
    oa: oa || null,
    behavioral: behavioural || null,
    resume: resume || null,
    ppt: ppt || null,
  };
}