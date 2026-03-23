import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

const SHEET_IDS = {
  responses: "1uWyaj_cvz_4DiFjeAYfvQ26wHoOkoNhu8Lr_kGDOd7Y",
  domains: "1TzqruDCK5j_HmqBrnEZA9Uz-1NIsKHIBsFR2TK0sDzE",
  master: "1TMF2fD5VBbUMFbgRQjstrwa4nnedt-_lB9ZbCCrDQRc",
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
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range, valueRenderOption: "FORMATTED_VALUE" });
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

// ── Active_Interviews (Technical Interview) ──────────────────────────
// Columns: A:Applicant Name | B:Email | C:Area of Interest | D:Interviewer Assigned
//          E:Interview Time Slot | F:Room No. | G:Scorecard | H:Feedback | I:Check-in

export async function getAllInterviews() {
  const rows = await readSheet(SHEET_IDS.master, "Active_Interviews!A:I");
  if (!rows || rows.length < 2) return [];
  return rows.slice(1).filter((r) => r[0]).map((row) => ({
    name: row[0] || "",
    email: row[1] || "",
    areaOfInterest: row[2] || "",
    interviewer: row[3] || "",
    timeSlot: row[4] || "",
    room: row[5] || "",
    scorecard: row[6] || "",
    feedback: row[7] || "",
    checkin: row[8] || "No",
  }));
}

export async function getCandidateByEmail(email) {
  const rows = await readSheet(SHEET_IDS.master, "Active_Interviews!A:I");
  if (!rows || rows.length < 2) return null;
  for (const row of rows.slice(1)) {
    if (row[1] && row[1].toLowerCase().trim() === email.toLowerCase().trim()) {
      return {
        name: row[0] || "", email: row[1] || "", areaOfInterest: row[2] || "",
        interviewer: row[3] || "", timeSlot: row[4] || "", room: row[5] || "",
        scorecard: row[6] || "", feedback: row[7] || "", checkin: row[8] || "No",
      };
    }
  }
  return null;
}

export async function updateInterviewRow(rowIndex, data) {
  const sheetRow = rowIndex + 2;
  const range = `Active_Interviews!A${sheetRow}:I${sheetRow}`;
  const values = [[
    data.name, data.email, data.areaOfInterest, data.interviewer,
    data.timeSlot, data.room, data.scorecard, data.feedback, data.checkin || "No",
  ]];
  return writeSheet(SHEET_IDS.master, range, values);
}

export async function addInterviewRow(data) {
  const values = [[
    data.name, data.email, data.areaOfInterest, data.interviewer,
    data.timeSlot, data.room, data.scorecard || "", data.feedback || "", data.checkin || "No",
  ]];
  return appendSheet(SHEET_IDS.master, "Active_Interviews!A:I", values);
}

// Check-in for Active_Interviews — find row by email, set column I to "Yes"
export async function checkinInterview(email) {
  const rows = await readSheet(SHEET_IDS.master, "Active_Interviews!B:B");
  for (let i = 1; i < rows.length; i++) {
    if (rows[i] && rows[i][0] && rows[i][0].toLowerCase().trim() === email.toLowerCase().trim()) {
      const sheetRow = i + 1; // 1-indexed
      await writeSheet(SHEET_IDS.master, `Active_Interviews!I${sheetRow}`, [["Yes"]]);
      return true;
    }
  }
  return false;
}

// Delete a row from Active_Interviews
export async function deleteInterviewRow(rowIndex) {
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_IDS.master });
  const activeSheet = spreadsheet.data.sheets.find((s) => s.properties.title === "Active_Interviews");
  if (!activeSheet) throw new Error("Active_Interviews tab not found");
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_IDS.master,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: activeSheet.properties.sheetId,
            dimension: "ROWS",
            startIndex: rowIndex + 1, // skip header
            endIndex: rowIndex + 2,
          },
        },
      }],
    },
  });
}

// ── OA Tab ───────────────────────────────────────────────────────────
// Columns: A:Name | B:Email | C:Domain | D:OA Score

export async function getOAByEmail(email) {
  const rows = await readSheet(SHEET_IDS.master, "OA!A:D");
  if (!rows || rows.length < 2) return null;
  for (const row of rows.slice(1)) {
    if (row[1] && row[1].toLowerCase().trim() === email.toLowerCase().trim()) {
      return { name: row[0] || "", email: row[1] || "", domain: row[2] || "", score: row[3] || "" };
    }
  }
  return null;
}

export async function checkinOA(name, email, domain) {
  const existing = await getOAByEmail(email);
  if (existing) return true; // already checked in
  await appendSheet(SHEET_IDS.master, "OA!A:D", [[name, email, domain, ""]]);
  return true;
}

// ── Behavioural_Interview Tab ─────────────────────────────────────────
// Columns: A:Name | B:Email | C:Domain | D:Room | E:Score | F:Feedback

export async function getBehavioralByEmail(email) {
  const rows = await readSheet(SHEET_IDS.master, "Behavioural_Interview!A:F");
  if (!rows || rows.length < 2) return null;
  for (const row of rows.slice(1)) {
    if (row[1] && row[1].toLowerCase().trim() === email.toLowerCase().trim()) {
      return {
        name: row[0] || "", email: row[1] || "", domain: row[2] || "",
        room: row[3] || "", score: row[4] || "", feedback: row[5] || "",
      };
    }
  }
  return null;
}

export async function checkinBehavioral(name, email, domain) {
  const existing = await getBehavioralByEmail(email);
  if (existing) return true;
  await appendSheet(SHEET_IDS.master, "Behavioural_Interview!A:F", [[name, email, domain, "", "", ""]]);
  return true;
}

// ── Resume_Review Tab ────────────────────────────────────────────────
// Columns: A:Name | B:Email | C:Domain | D:Score | E:Notes

export async function getResumeByEmail(email) {
  const rows = await readSheet(SHEET_IDS.master, "Resume_Review!A:E");
  if (!rows || rows.length < 2) return null;
  for (const row of rows.slice(1)) {
    if (row[1] && row[1].toLowerCase().trim() === email.toLowerCase().trim()) {
      return {
        name: row[0] || "", email: row[1] || "", domain: row[2] || "",
        score: row[3] || "", notes: row[4] || "",
      };
    }
  }
  return null;
}

export async function checkinResume(name, email, domain) {
  const existing = await getResumeByEmail(email);
  if (existing) return true;
  await appendSheet(SHEET_IDS.master, "Resume_Review!A:E", [[name, email, domain, "", ""]]);
  return true;
}

// ── PPT_Presentation Tab ────────────────────────────────────────────
// Columns: A:Name | B:Email | C:Domain | D:Score | E:Feedback

export async function getPPTByEmail(email) {
  const rows = await readSheet(SHEET_IDS.master, "PPT_Presentation!A:E");
  if (!rows || rows.length < 2) return null;
  for (const row of rows.slice(1)) {
    if (row[1] && row[1].toLowerCase().trim() === email.toLowerCase().trim()) {
      return {
        name: row[0] || "", email: row[1] || "", domain: row[2] || "",
        score: row[3] || "", feedback: row[4] || "",
      };
    }
  }
  return null;
}

export async function checkinPPT(name, email, domain) {
  const existing = await getPPTByEmail(email);
  if (existing) return true;
  await appendSheet(SHEET_IDS.master, "PPT_Presentation!A:E", [[name, email, domain, "", ""]]);
  return true;
}

// ── Helper_Candidates ────────────────────────────────────────────────
export async function getHelperCandidates() {
  const rows = await readSheet(SHEET_IDS.master, "Helper_Candidates!A:C");
  if (!rows || rows.length < 2) return [];
  return rows.slice(1).filter((row) => row[0]).map((row) => ({
    name: row[0] || "", email: row[1] || "", areaOfInterest: row[2] || "",
  }));
}

// ── Settings ─────────────────────────────────────────────────────────
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

// ── Get ALL station data for a candidate (used by candidate portal) ─
export async function getCandidateJourney(email) {
  const [interview, oa, behavioral, resume, ppt] = await Promise.all([
    getCandidateByEmail(email),
    getOAByEmail(email),
    getBehavioralByEmail(email),
    getResumeByEmail(email),
    getPPTByEmail(email),
  ]);

  // Determine status for each station
  function stationStatus(data, scoreField = "score") {
    if (!data) return "Pending";
    if (data[scoreField] && data[scoreField] !== "") return "Completed";
    return "In Progress";
  }

  // For interview, also check the checkin field
  let interviewStatus = "Pending";
  if (interview) {
    if (interview.checkin === "Yes") {
      interviewStatus = interview.scorecard ? "Completed" : "In Progress";
    } else {
      interviewStatus = "Pending";
    }
  }

  const statuses = {
    oa: stationStatus(oa),
    interview: interviewStatus,
    behavioral: stationStatus(behavioral),
    resume: stationStatus(resume),
    ppt: stationStatus(ppt),
  };

  const completed = Object.values(statuses).filter((s) => s === "Completed").length;

  return {
    name: interview?.name || oa?.name || behavioral?.name || resume?.name || ppt?.name || "",
    email,
    domain: interview?.areaOfInterest || oa?.domain || behavioral?.domain || resume?.domain || ppt?.domain || "",
    progress: `${completed}/5`,
    completedCount: completed,
    statuses,
    interview: interview || null,
    oa: oa || null,
    behavioral: behavioral || null,
    resume: resume || null,
    ppt: ppt || null,
  };
}

export { SHEET_IDS };