import { NextResponse } from "next/server";
import {
  getAllInterviews,
  getCandidateByEmail,
  getCandidateJourney,
  getHelperCandidates,
  getSettings,
  getOAByEmail,
  getBehavioralByEmail,
  getResumeByEmail,
  getPPTByEmail,
} from "@/lib/sheets";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const email = searchParams.get("email");

  try {
    switch (action) {
      // ── Candidate portal: get full journey ──
      case "journey": {
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
        const journey = await getCandidateJourney(email);
        if (!journey.name && !journey.oa && !journey.interview && !journey.behavioral && !journey.resume && !journey.ppt) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.json(journey);
      }

      // ── Legacy: single interview lookup ──
      case "candidate": {
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
        const candidate = await getCandidateByEmail(email);
        if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(candidate);
      }

      // ── Admin: all interviews ──
      case "all-interviews": {
        const interviews = await getAllInterviews();
        return NextResponse.json(interviews);
      }

      // ── Admin: helper candidates for dropdowns ──
      case "helpers": {
        const helpers = await getHelperCandidates();
        return NextResponse.json(helpers);
      }

      // ── Admin: settings ──
      case "settings": {
        const settings = await getSettings();
        return NextResponse.json(settings);
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Sheets API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data", details: error.message },
      { status: 500 }
    );
  }
}